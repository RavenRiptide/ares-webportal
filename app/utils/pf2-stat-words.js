// A stat block's parts as the creature editor writes them in words, and read back. Each pair round-trips:
// what `fooText` writes, `foo` reads as the same value.

const CATEGORIES = ['persistent', 'splash', 'precision'];

// Split at commas outside parentheses: `physical 5 (except silver, cold iron), fire 10`.
export function listed(text) {
  let parts = [];
  let depth = 0;
  let held = '';
  for (let one of String(text || '')) {
    if (one === '(') depth += 1;
    if (one === ')') depth = Math.max(0, depth - 1);
    if (one === ',' && depth === 0) {
      parts.push(held);
      held = '';
    } else held += one;
  }
  parts.push(held);
  return parts.map((one) => one.trim()).filter((one) => one.length);
}

function slug(key) {
  return key.trim().toLowerCase().replace(/\s+/g, '-');
}

function titled(key) {
  return key
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// The key a word names: one the block already has, however it is cased, or a new one written as the
// block writes them - `Warfare Lore` for a skill, `cold-iron` for anything else.
function keyed(word, before, style) {
  let found = Object.keys(before || {}).find((key) => slug(key) === slug(word));
  if (found) return found;
  return style === 'skill' ? titled(word) : slug(word);
}

// `athletics 9, warfare lore 7` as `{ Athletics: 9, 'Warfare Lore': 7 }`.
export function valued(text, before = {}, style = 'key') {
  let out = {};
  listed(text).forEach((one) => {
    let found = one.match(/^(.+?)\s+([+-]?\d+)$/);
    if (found) out[keyed(found[1], before, style)] = Number(found[2]);
  });
  return out;
}

export function valuedText(held) {
  return Object.entries(held || {})
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key.replace(/-/g, ' ')} ${value}`)
    .join(', ');
}

function also(words) {
  return words
    .split(/\s+or\s+/i)
    .map((one) => slug(one))
    .filter((one) => one.length);
}

// `physical 5 (except silver or cold iron; double non-magical), fire 10`.
export function resisted(text) {
  let out = {};
  listed(text).forEach((one) => {
    let found = one.match(/^(.+?)\s+([+-]?\d+)\s*(?:\((.*)\))?$/);
    if (!found) return;
    let held = { value: Number(found[2]) };
    (found[3] || '').split(';').forEach((part) => {
      let named = part.trim().match(/^(except|double)\s+(.+)$/i);
      if (named) held[named[1].toLowerCase()] = also(named[2]);
    });
    out[slug(found[1])] = held.except || held.double ? held : held.value;
  });
  return out;
}

export function resistedText(held) {
  return Object.entries(held || {})
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      if (typeof value !== 'object')
        return `${key.replace(/-/g, ' ')} ${value}`;
      let notes = ['except', 'double']
        .filter((word) => (value[word] || []).length)
        .map(
          (word) =>
            `${word} ${value[word].map((one) => one.replace(/-/g, ' ')).join(' or ')}`,
        );
      let tail = notes.length ? ` (${notes.join('; ')})` : '';
      return `${key.replace(/-/g, ' ')} ${value.value}${tail}`;
    })
    .join(', ');
}

// `2d8+5 piercing plus 1d6 persistent fire plus 1 splash acid`; a formula with no type is untyped.
export function damage(text) {
  return String(text || '')
    .split(/\s+plus\s+/i)
    .map((one) =>
      one
        .trim()
        .match(/^(\S+)(?:\s+(persistent|splash|precision))?(?:\s+(.+))?$/i),
    )
    .filter((found) => found)
    .map((found) => [
      found[1],
      (found[3] || 'untyped').trim().toLowerCase(),
      found[2] ? found[2].toLowerCase() : null,
    ]);
}

export function damageText(held) {
  return (held || [])
    .map(([formula, type, category]) =>
      [
        formula,
        CATEGORIES.includes(category) ? category : null,
        type === 'untyped' ? null : type,
      ]
        .filter((one) => one)
        .join(' '),
    )
    .join(' plus ');
}
