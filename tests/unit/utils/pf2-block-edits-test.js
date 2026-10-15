import { module, test } from 'qunit';
import {
  costed,
  costOf,
  placed,
  read,
  rowAdded,
  rowMoved,
  rowRemoved,
  rowSet,
  runsOf,
  textKept,
  textShown,
} from 'ares-webportal/utils/pf2-block-edits';

// A creature's stat block changed one part at a time, as the creature editor changes it.
module('Unit | Utility | pf2-block-edits', function (hooks) {
  hooks.beforeEach(function () {
    this.block = {
      saves: { will: 3 },
      strikes: [{ name: 'Jaws', bonus: 5 }],
      actions: [{ name: 'Howl', type: 'action', cost: 2, text: 'a%rb' }],
      skills: { Athletics: 3 },
    };
  });

  test('every change is a new block, and the one given is left as it was', function (assert) {
    let before = JSON.stringify(this.block);

    placed(this.block, ['saves', 'reflex'], 4);
    rowSet(this.block, 'strikes', 0, 'bonus', 7);
    rowAdded(this.block, 'actions');
    rowRemoved(this.block, 'actions', 0);

    assert.strictEqual(JSON.stringify(this.block), before);
  });

  test('a value is set however deep, making what holds it', function (assert) {
    assert.deepEqual(placed(this.block, ['saves', 'reflex'], 4).saves, {
      will: 3,
      reflex: 4,
    });
    assert.deepEqual(placed({}, ['saves', 'fortitude'], 1), {
      saves: { fortitude: 1 },
    });
  });

  test('a Strike or ability is set, added, removed and moved', function (assert) {
    assert.strictEqual(
      rowSet(this.block, 'strikes', 0, 'bonus', 7).strikes[0].bonus,
      7,
    );
    assert.deepEqual(rowAdded(this.block, 'strikes').strikes[1].damage, []);
    assert.strictEqual(
      rowAdded(this.block, 'actions').actions[1].type,
      'action',
    );
    assert.deepEqual(rowRemoved(this.block, 'actions', 0).actions, []);

    let two = rowAdded(this.block, 'strikes');
    assert.deepEqual(
      rowMoved(two, 'strikes', 0, 1).strikes.map((one) => one.name),
      ['', 'Jaws'],
    );
    assert.strictEqual(
      rowMoved(this.block, 'strikes', 0, -1),
      this.block,
      'nothing moves past the end',
    );
  });

  test("a field's words are read by its kind", function (assert) {
    assert.strictEqual(read('number', ''), null);
    assert.strictEqual(read('number', '12'), 12);
    assert.deepEqual(read('list', 'a, b (c, d)'), ['a', 'b (c, d)']);
    assert.deepEqual(
      read('skills', 'athletics 5, sailing lore 2', this.block.skills),
      { Athletics: 5, 'Sailing Lore': 2 },
    );
    assert.deepEqual(read('valued', 'land 25'), { land: 25 });
    assert.strictEqual(read('text', 'Barrow Hound'), 'Barrow Hound');
  });

  test("an ability's cost and text as the editor offers them", function (assert) {
    assert.strictEqual(costOf(this.block.actions[0]), '2');
    assert.strictEqual(costOf({ type: 'reaction' }), 'reaction');
    assert.deepEqual(costed('3'), { type: 'action', cost: 3 });
    assert.deepEqual(costed('free'), { type: 'free', cost: null });
    assert.strictEqual(textShown('a%rb'), 'a\nb');
    assert.strictEqual(textKept('a\r\nb'), 'a%rb');
  });

  test('what the game runs of one part', function (assert) {
    let runs = [
      { part: 'Strike Jaws' },
      { part: 'Jaws: Grab' },
      { part: 'Howl' },
    ];

    assert.deepEqual(runsOf(runs, 'Strike Jaws', 'Jaws'), runs.slice(0, 2));
  });
});
