import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import {
  damage,
  damageText,
  resisted,
  resistedText,
  valuedText,
} from '../utils/pf2-stat-words';
import {
  castingAdded,
  castingName,
  costed,
  frequencyOf,
  frequencySet,
  slotsSet,
  spellAdded,
  spellName,
  spellRemoved,
  costOf,
  placed,
  read,
  rowAdded,
  rowMoved,
  rowRemoved,
  rowSet,
  runsOf,
  shapesOf,
  textKept,
  textShown,
} from '../utils/pf2-block-edits';

// The creature editor: a stat block built part by part, checked by the game as it changes, and saved as
// a new creature or a new revision of one. `@start` is `{ id, name, block, notes, revision, cloned_from }`.
export default class Pf2CreatureEditor extends Component {
  @service gameApi;
  @service router;
  @service flashMessages;

  @tracked name;
  @tracked block;
  @tracked notes;
  @tracked check = null;
  @tracked saving = false;
  @tracked section = 'identity';

  sections = [
    { key: 'identity', label: 'Identity' },
    { key: 'defences', label: 'Defenses' },
    { key: 'senses', label: 'Senses and skills' },
    { key: 'strikes', label: 'Strikes' },
    { key: 'abilities', label: 'Abilities' },
    { key: 'spells', label: 'Spells' },
    { key: 'notes', label: 'Notes' },
  ];

  traditions = ['arcane', 'divine', 'occult', 'primal'];
  castingTypes = ['prepared', 'spontaneous', 'innate', 'focus', 'items'];
  ranks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // How often an innate spell is cast, as its words say it.
  frequencies = [
    { value: '1', label: 'once a day' },
    { value: '2', label: 'twice a day' },
    { value: '3', label: 'three times a day' },
    { value: 'at will', label: 'at will' },
    { value: 'constant', label: 'constant' },
  ];

  // What each spellcasting entry's search found: `{ [index]: { words, rank, results } }`. Its words and
  // rank are kept as typed without redrawing, which would take the focus from the box being typed in.
  @tracked searches = {};
  typing = {};

  figures = [
    { key: 'ac', label: 'AC' },
    { key: 'hp', label: 'Hit Points' },
    { key: 'hardness', label: 'Hardness' },
  ];

  saveFields = [
    { key: 'fortitude', label: 'Fortitude', path: 'saves.fortitude' },
    { key: 'reflex', label: 'Reflex', path: 'saves.reflex' },
    { key: 'will', label: 'Will', path: 'saves.will' },
  ];

  timer = null;

  constructor(owner, args) {
    super(owner, args);
    let start = args.start || {};
    this.name = start.name || start.block?.name || '';
    this.block = JSON.parse(JSON.stringify(start.block || {}));
    this.notes = start.notes || '';
    this.checkSoon(0);
  }

  get traitsText() {
    return (this.block.traits || []).join(', ');
  }

  get immunitiesText() {
    return (this.block.immunities || []).join(', ');
  }

  get sensesText() {
    return (this.block.senses || []).join(', ');
  }

  get skillsText() {
    return valuedText(this.block.skills);
  }

  get weaknessesText() {
    return resistedText(this.block.weaknesses);
  }

  get resistancesText() {
    return resistedText(this.block.resistances);
  }

  get speedText() {
    return valuedText(this.block.speeds);
  }

  get shapes() {
    return shapesOf(this.block);
  }

  get errors() {
    return this.check?.errors || [];
  }

  get warnings() {
    return this.check?.warnings || [];
  }

  get mechanised() {
    return this.check?.mechanised || [];
  }

  get canSave() {
    return !this.saving && this.check && this.errors.length === 0;
  }

  get strikes() {
    return (this.block.strikes || []).map((strike, index) => ({
      index,
      strike,
      damageText: damageText(strike.damage),
      traitsText: (strike.traits || []).join(', '),
      effectsText: (strike.effects || []).join(', '),
      runs: runsOf(this.mechanised, `Strike ${strike.name}`, strike.name),
    }));
  }

  get abilities() {
    return (this.block.actions || []).map((ability, index) => ({
      index,
      ability,
      cost: costOf(ability),
      text: textShown(ability.text),
      traitsText: (ability.traits || []).join(', '),
      runs: runsOf(this.mechanised, ability.name, ability.name),
    }));
  }

  get castings() {
    return (this.block.spellcasting || []).map((casting, index) => ({
      index,
      casting,
      innate: casting.type === 'innate',
      spontaneous: casting.type === 'spontaneous',
      search: this.searched(index),
      ranks: Object.keys(casting.spells || {})
        .map(Number)
        .sort((one, two) => one - two)
        .map((rank) => ({
          rank,
          label: rank === 0 ? 'Cantrips' : `Rank ${rank}`,
          slots: (casting.slots || {})[rank] ?? '',
          spells: (casting.spells[rank] || []).map((name, at) => ({
            name,
            at,
            base: spellName(name),
            frequency: String(frequencyOf(casting, name)),
            announced: this.mechanised.some(
              (one) => one.part === `Spell ${name}` && one.runs === 'announced',
            ),
          })),
        })),
    }));
  }

  // What an entry's search found, and whether its words are a spell the game does not list, which the
  // author may add as written.
  searched(index) {
    let held = this.searches[index] || { words: '', rank: '', results: null };
    let words = (held.words || '').trim().toLowerCase();
    let listed = (held.results || []).some(
      (one) => one.name.toLowerCase() === words,
    );
    return {
      ...held,
      done: Array.isArray(held.results),
      unlisted: Array.isArray(held.results) && words && !listed,
    };
  }

  // Every change is a new block, which the game checks a moment later.
  changed(block) {
    this.block = block;
    this.checkSoon();
  }

  @action
  show(section) {
    this.section = section;
  }

  @action
  setName(event) {
    this.name = event.target.value;
    this.checkSoon();
  }

  @action
  setNotes(event) {
    this.notes = event.target.value;
  }

  @action
  setField(path, kind, event) {
    let keys = path.split('.');
    let before = keys.reduce((held, key) => held?.[key], this.block);
    this.changed(
      placed(this.block, keys, read(kind, event.target.value, before)),
    );
  }

  @action
  setResisted(field, event) {
    this.changed(placed(this.block, [field], resisted(event.target.value)));
  }

  @action
  setRow(field, index, key, kind, event) {
    this.changed(
      rowSet(this.block, field, index, key, read(kind, event.target.value)),
    );
  }

  @action
  setDamage(index, event) {
    this.changed(
      rowSet(
        this.block,
        'strikes',
        index,
        'damage',
        damage(event.target.value),
      ),
    );
  }

  @action
  setText(index, event) {
    this.changed(
      rowSet(
        this.block,
        'actions',
        index,
        'text',
        textKept(event.target.value),
      ),
    );
  }

  @action
  setCost(index, event) {
    let cost = costed(event.target.value);
    let block = rowSet(this.block, 'actions', index, 'type', cost.type);
    this.changed(rowSet(block, 'actions', index, 'cost', cost.cost));
  }

  @action
  addCasting() {
    this.changed(castingAdded(this.block));
  }

  // A tradition or way of casting changed renames an entry still called by the two.
  @action
  setCasting(index, key, kind, event) {
    let before = this.block.spellcasting[index];
    let value = read(kind, event.target.value);
    let block = rowSet(this.block, 'spellcasting', index, key, value);
    if (
      ['tradition', 'type'].includes(key) &&
      before.name === castingName(before.tradition, before.type)
    ) {
      let after = block.spellcasting[index];
      block = rowSet(
        block,
        'spellcasting',
        index,
        'name',
        castingName(after.tradition, after.type),
      );
    }
    this.changed(block);
  }

  @action
  typedSearch(index, key, event) {
    this.typing[index] = { ...this.typing[index], [key]: event.target.value };
  }

  @action
  async searchSpells(index, event) {
    event.preventDefault();
    let held = {
      words: '',
      rank: '',
      ...this.searches[index],
      ...this.typing[index],
    };
    let answer = await this.gameApi.request('pf2CreatureSpells', {
      words: held.words,
      tradition: this.block.spellcasting[index].tradition,
    });
    if (this.isDestroying || this.isDestroyed) return;
    this.searches = {
      ...this.searches,
      [index]: { ...held, results: answer?.spells || [] },
    };
  }

  // At the rank chosen, which heightens it, or at its own.
  @action
  addFound(index, found) {
    let rank = { ...this.searches[index], ...this.typing[index] }.rank;
    this.addSpell(
      index,
      rank === '' || rank === undefined ? found.rank : Number(rank),
      found.name,
    );
  }

  addSpell(index, rank, name) {
    this.changed(spellAdded(this.block, index, rank, name));
  }

  // A spell the game does not list, as the author writes it, at the rank searched for or rank 1.
  @action
  addWritten(index) {
    let held = { ...this.searches[index], ...this.typing[index] };
    let name = (held.words || '').trim();
    if (!name) return;
    this.addSpell(index, held.rank === '' ? 1 : Number(held.rank), name);
  }

  @action
  removeSpell(index, rank, at) {
    this.changed(spellRemoved(this.block, index, rank, at));
  }

  @action
  setSlots(index, rank, event) {
    this.changed(slotsSet(this.block, index, rank, event.target.value));
  }

  @action
  setFrequency(index, rank, at, event) {
    this.changed(frequencySet(this.block, index, rank, at, event.target.value));
  }

  @action
  addRow(field) {
    this.changed(rowAdded(this.block, field));
  }

  @action
  removeRow(field, index) {
    this.changed(rowRemoved(this.block, field, index));
  }

  @action
  moveRow(field, index, by) {
    this.changed(rowMoved(this.block, field, index, by));
  }

  // The game checks the block a moment after the last change, not on every key.
  checkSoon(wait = 500) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.runCheck(), wait);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    clearTimeout(this.timer);
  }

  async runCheck() {
    let start = this.args.start || {};
    let answer = await this.gameApi.request('pf2CreatureCheck', {
      id: start.id,
      name: this.name,
      block: this.block,
      cloned_from: start.cloned_from,
    });
    if (!this.isDestroying && !this.isDestroyed) this.check = answer;
  }

  @action
  async save() {
    let start = this.args.start || {};
    this.saving = true;
    let answer = await this.gameApi.requestOne(
      'pf2CreatureSave',
      {
        id: start.id,
        base_revision: start.revision,
        name: this.name,
        block: this.block,
        notes: this.notes,
        cloned_from: start.cloned_from,
      },
      null,
    );
    this.saving = false;

    if (answer.errors) {
      this.check = { ...this.check, errors: answer.errors };
      return;
    }
    if (answer.error) return;

    this.flashMessages.success(
      `Saved as revision ${answer.revision}: ${answer.summary}`,
    );
    this.router.transitionTo('pf2-creature', `saved:${answer.id}`);
  }
}
