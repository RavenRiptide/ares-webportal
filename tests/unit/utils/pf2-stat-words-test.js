import { module, test } from 'qunit';
import {
  damage,
  damageText,
  listed,
  resisted,
  resistedText,
  valued,
  valuedText,
} from 'ares-webportal/utils/pf2-stat-words';

// A stat block's parts in the creature editor's words: each writer's words read back as what it wrote.
module('Unit | Utility | pf2-stat-words', function () {
  test('a resistance keeps what it excepts and what it doubles against', function (assert) {
    let held = {
      physical: {
        value: 5,
        except: ['silver', 'cold-iron'],
        double: ['non-magical'],
      },
      fire: 10,
    };
    let words = resistedText(held);

    assert.strictEqual(
      words,
      'physical 5 (except silver or cold iron; double non magical), fire 10',
    );
    assert.deepEqual(resisted(words), held);
    assert.deepEqual(resisted('all damage 3 (except force)'), {
      'all-damage': { value: 3, except: ['force'] },
    });
  });

  test('damage keeps each category, and a formula alone is untyped', function (assert) {
    let held = [
      ['2d8+5', 'piercing', null],
      ['1d6', 'fire', 'persistent'],
      ['1', 'acid', 'splash'],
      ['1d6', 'piercing', 'precision'],
      ['1d4', 'untyped', null],
    ];
    let words = damageText(held);

    assert.strictEqual(
      words,
      '2d8+5 piercing plus 1d6 persistent fire plus 1 splash acid plus 1d6 precision piercing plus 1d4',
    );
    assert.deepEqual(damage(words), held);
  });

  test('a skill keeps the name the block gives it, and a new one is titled', function (assert) {
    assert.deepEqual(
      valued('athletics 9, warfare lore 7', { Athletics: 3 }, 'skill'),
      { Athletics: 9, 'Warfare Lore': 7 },
    );
    assert.deepEqual(valued('land 25, fly 40'), { land: 25, fly: 40 });
  });

  test('a value that is not there is not written', function (assert) {
    assert.strictEqual(valuedText({ land: 25, swim: null }), 'land 25');
  });

  test('a list splits at commas outside brackets', function (assert) {
    assert.deepEqual(listed('a (b, c), d'), ['a (b, c)', 'd']);
  });
});
