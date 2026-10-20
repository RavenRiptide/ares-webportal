// A creature's stat block changed one part at a time, as the creature editor changes it. Each function
// answers a new block and leaves the one it was given as it was.

import { listed, valued } from './pf2-stat-words';

function copied(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

// One value set, however deep: `['saves', 'reflex']`.
export function placed(block, path, value) {
  let copy = copied(block) || {};
  let held = copy;
  path.slice(0, -1).forEach((key) => {
    held[key] = held[key] || {};
    held = held[key];
  });
  held[path[path.length - 1]] = value;
  return copy;
}

// What a field's words hold, by the kind of field: `number`, `list`, `skills` or `valued`, or the words.
export function read(kind, raw, before) {
  if (kind === 'number') return raw === '' || raw === null ? null : Number(raw);
  if (kind === 'list') return listed(raw);
  if (kind === 'skills') return valued(raw, before, 'skill');
  if (kind === 'valued') return valued(raw, before, 'key');
  return raw;
}

const NEW_ROWS = {
  strikes: () => ({ name: '', bonus: 0, damage: [], traits: [], effects: [] }),
  actions: () => ({ name: '', type: 'action', cost: 1, traits: [], text: '' }),
};

function rows(block, field) {
  return copied(block[field] || []);
}

export function rowSet(block, field, index, key, value) {
  let held = rows(block, field);
  held[index] = { ...held[index], [key]: value };
  return placed(block, [field], held);
}

export function rowAdded(block, field) {
  return placed(block, [field], [...rows(block, field), NEW_ROWS[field]()]);
}

export function rowRemoved(block, field, index) {
  return placed(
    block,
    [field],
    rows(block, field).filter((_one, at) => at !== index),
  );
}

export function rowMoved(block, field, index, by) {
  let held = rows(block, field);
  let to = index + by;
  if (to < 0 || to >= held.length) return block;
  [held[index], held[to]] = [held[to], held[index]];
  return placed(block, [field], held);
}

const ACTIONS = ['1', '2', '3'];

// An ability's cost as the editor offers it: `1` to `3` actions, `reaction`, `free` or `passive`.
export function costOf(ability) {
  return ability.type === 'action' ? String(ability.cost || 1) : ability.type;
}

export function costed(value) {
  return ACTIONS.includes(value)
    ? { type: 'action', cost: Number(value) }
    : { type: value, cost: null };
}

// The game breaks a line with %r; a text box breaks it with a newline.
export function textShown(text) {
  return (text || '').replace(/%r/g, '\n');
}

export function textKept(text) {
  return (text || '').replace(/\r?\n/g, '%r');
}

// The shapes its abilities give it, as Foundry declares them: a werewolf's Change Shape offers hybrid,
// humanoid and animal. `[{ value, label }]`, each once.
export function shapesOf(block) {
  let seen = new Set();
  return (block?.actions || [])
    .flatMap((one) => one.rules || [])
    .filter((rule) => rule.key === 'RollOption')
    .flatMap((rule) => rule.suboptions || [])
    .filter((choice) => {
      let fresh = !seen.has(choice.value);
      seen.add(choice.value);
      return fresh;
    })
    .map((choice) => ({
      value: choice.value,
      label: choice.label || choice.value,
    }));
}

// What the game runs of one Strike or ability, out of what it runs of the whole block.
export function runsOf(mechanised, part, name) {
  return (mechanised || []).filter(
    (one) => one.part === part || one.part.startsWith(`${name}: `),
  );
}

// Spellcasting, entry by entry, as the bestiary writes it: spells by rank, `slots` by rank for a
// spontaneous caster, and for an innate one `uses` a day by spell, or `(At Will)` or `(Constant)` after
// its name.

const SUFFIX = /\s*\((At Will|Constant)\)$/i;

export function castingName(tradition, type) {
  let word = (one) => (one ? one.charAt(0).toUpperCase() + one.slice(1) : '');
  return `${word(tradition)} ${word(type)} Spells`.trim();
}

export function castingAdded(block) {
  return placed(
    block,
    ['spellcasting'],
    [
      ...rows(block, 'spellcasting'),
      {
        name: castingName('arcane', 'innate'),
        tradition: 'arcane',
        type: 'innate',
        dc: 0,
        attack: 0,
        spells: {},
      },
    ],
  );
}

// A spell's own name, without how often an innate one is cast.
export function spellName(name) {
  return String(name || '').replace(SUFFIX, '');
}

// How often an innate spell is cast: `at will`, `constant`, or a number a day.
export function frequencyOf(casting, name) {
  let found = String(name || '').match(SUFFIX);
  if (found) return found[1].toLowerCase();
  return Number((casting.uses || {})[name]) || 1;
}

function casting(block, index) {
  return copied(block.spellcasting?.[index] || {});
}

function withCasting(block, index, held) {
  let all = rows(block, 'spellcasting');
  all[index] = held;
  return placed(block, ['spellcasting'], all);
}

// A spell at a rank. A spontaneous caster gets a slot at a rank it had none for, which it needs to cast.
export function spellAdded(block, index, rank, name) {
  let held = casting(block, index);
  let key = String(rank);
  held.spells = { ...(held.spells || {}) };
  held.spells[key] = [...(held.spells[key] || []), name];
  if (
    held.type === 'spontaneous' &&
    Number(rank) > 0 &&
    !(held.slots || {})[key]
  )
    held.slots = { ...(held.slots || {}), [key]: 1 };
  return withCasting(block, index, held);
}

export function spellRemoved(block, index, rank, at) {
  let held = casting(block, index);
  let key = String(rank);
  let names = [...((held.spells || {})[key] || [])];
  let [gone] = names.splice(at, 1);
  held.spells = { ...(held.spells || {}), [key]: names };
  if (!names.length) delete held.spells[key];
  if (held.uses && gone in held.uses) {
    held.uses = { ...held.uses };
    delete held.uses[gone];
    if (!Object.keys(held.uses).length) delete held.uses;
  }
  return withCasting(block, index, held);
}

export function slotsSet(block, index, rank, count) {
  let held = casting(block, index);
  held.slots = { ...(held.slots || {}), [String(rank)]: Number(count) || 0 };
  return withCasting(block, index, held);
}

// An innate spell's frequency: `at will` and `constant` are written after its name, a number a day as
// its uses, and once a day as nothing at all.
export function frequencySet(block, index, rank, at, frequency) {
  let held = casting(block, index);
  let key = String(rank);
  let names = [...((held.spells || {})[key] || [])];
  let was = names[at];
  let base = spellName(was);
  let named =
    frequency === 'at will'
      ? `${base} (At Will)`
      : frequency === 'constant'
        ? `${base} (Constant)`
        : base;
  names[at] = named;
  held.spells = { ...(held.spells || {}), [key]: names };
  held.uses = { ...(held.uses || {}) };
  delete held.uses[was];
  if (Number(frequency) > 1) held.uses[named] = Number(frequency);
  if (!Object.keys(held.uses).length) delete held.uses;
  return withCasting(block, index, held);
}
