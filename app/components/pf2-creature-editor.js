import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';

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
    { key: 'defences', label: 'Defences' },
    { key: 'senses', label: 'Senses and skills' },
    { key: 'strikes', label: 'Strikes' },
    { key: 'abilities', label: 'Abilities' },
    { key: 'notes', label: 'Notes' },
  ];

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

  // A copy of the block with one value set, however deep: `['saves', 'reflex']`.
  placed(path, value) {
    let copy = JSON.parse(JSON.stringify(this.block));
    let held = copy;
    path.slice(0, -1).forEach((key) => {
      held[key] = held[key] || {};
      held = held[key];
    });
    held[path[path.length - 1]] = value;
    return copy;
  }

  number(value) {
    return value === '' || value === null ? null : Number(value);
  }

  list(value) {
    return value
      .split(',')
      .map((one) => one.trim())
      .filter((one) => one.length);
  }

  // Each key with its value: `fire 5, cold iron 3` as `{ fire: 5, 'cold-iron': 3 }`.
  valued(value) {
    let out = {};
    this.list(value).forEach((one) => {
      let found = one.match(/^(.+?)\s+([+-]?\d+)$/);
      if (found)
        out[found[1].trim().toLowerCase().replace(/\s+/g, '-')] = Number(
          found[2],
        );
    });
    return out;
  }

  words(held) {
    return Object.entries(held || {})
      .map(
        ([key, value]) =>
          `${key.replace(/-/g, ' ')} ${typeof value === 'object' ? value.value : value}`,
      )
      .join(', ');
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
    return this.words(this.block.skills);
  }

  get weaknessesText() {
    return this.words(this.block.weaknesses);
  }

  get resistancesText() {
    return this.words(this.block.resistances);
  }

  get speedText() {
    return this.words(this.block.speeds);
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
    let raw = event.target.value;
    let value =
      kind === 'number'
        ? this.number(raw)
        : kind === 'list'
          ? this.list(raw)
          : kind === 'valued'
            ? this.valued(raw)
            : raw;
    this.block = this.placed(path.split('.'), value);
    this.checkSoon();
  }

  // Resistances keep any `except` a stat block gave them where the type and value are unchanged.
  @action
  setResisted(field, event) {
    let read = this.valued(event.target.value);
    let before = this.block[field] || {};
    Object.keys(read).forEach((type) => {
      if (typeof before[type] === 'object' && before[type].value === read[type])
        read[type] = before[type];
    });
    this.block = this.placed([field], read);
    this.checkSoon();
  }

  rows(field) {
    return JSON.parse(JSON.stringify(this.block[field] || []));
  }

  @action
  setRow(field, index, key, kind, event) {
    let rows = this.rows(field);
    let raw = event.target.value;
    rows[index][key] =
      kind === 'number'
        ? this.number(raw)
        : kind === 'list'
          ? this.list(raw)
          : raw;
    this.block = this.placed([field], rows);
    this.checkSoon();
  }

  // A Strike's damage, written as `2d8+5 piercing plus 1d6 persistent fire`.
  @action
  setDamage(index, event) {
    let rows = this.rows('strikes');
    rows[index].damage = event.target.value
      .split(/\s+plus\s+/i)
      .map((one) => one.trim().match(/^(\S+)\s+(persistent\s+)?(.+)$/i))
      .filter((found) => found)
      .map((found) => [
        found[1],
        found[3].trim().toLowerCase(),
        found[2] ? 'persistent' : null,
      ]);
    this.block = this.placed(['strikes'], rows);
    this.checkSoon();
  }

  damageText(strike) {
    return (strike.damage || [])
      .map(([formula, type, category]) =>
        [formula, category === 'persistent' ? 'persistent' : null, type]
          .filter((one) => one)
          .join(' '),
      )
      .join(' plus ');
  }

  get strikes() {
    return (this.block.strikes || []).map((strike, index) => ({
      index,
      strike,
      damageText: this.damageText(strike),
      traitsText: (strike.traits || []).join(', '),
      effectsText: (strike.effects || []).join(', '),
      runs: this.mechanised.filter(
        (one) =>
          one.part === `Strike ${strike.name}` ||
          one.part.startsWith(`${strike.name}: `),
      ),
    }));
  }

  get abilities() {
    return (this.block.actions || []).map((ability, index) => ({
      index,
      ability,
      cost:
        ability.type === 'action' ? String(ability.cost || 1) : ability.type,
      // The game breaks a line with %r; the box shows a line break.
      text: (ability.text || '').replace(/%r/g, '\n'),
      traitsText: (ability.traits || []).join(', '),
      runs: this.mechanised.filter(
        (one) =>
          one.part === ability.name || one.part.startsWith(`${ability.name}: `),
      ),
    }));
  }

  @action
  setText(index, event) {
    let rows = this.rows('actions');
    rows[index].text = event.target.value.replace(/\r?\n/g, '%r');
    this.block = this.placed(['actions'], rows);
    this.checkSoon();
  }

  @action
  setCost(index, event) {
    let rows = this.rows('actions');
    let value = event.target.value;
    rows[index].type = ['1', '2', '3'].includes(value) ? 'action' : value;
    rows[index].cost = ['1', '2', '3'].includes(value) ? Number(value) : null;
    this.block = this.placed(['actions'], rows);
    this.checkSoon();
  }

  @action
  addRow(field) {
    let rows = this.rows(field);
    rows.push(
      field === 'strikes'
        ? { name: '', bonus: 0, damage: [], traits: [], effects: [] }
        : { name: '', type: 'action', cost: 1, traits: [], text: '' },
    );
    this.block = this.placed([field], rows);
    this.checkSoon();
  }

  @action
  removeRow(field, index) {
    let rows = this.rows(field);
    rows.splice(index, 1);
    this.block = this.placed([field], rows);
    this.checkSoon();
  }

  @action
  moveRow(field, index, by) {
    let rows = this.rows(field);
    let to = index + by;
    if (to < 0 || to >= rows.length) return;
    [rows[index], rows[to]] = [rows[to], rows[index]];
    this.block = this.placed([field], rows);
    this.checkSoon();
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
