import { module, test } from 'qunit';
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

  test('the shapes its abilities give it, each once', function (assert) {
    let shaping = {
      key: 'RollOption',
      option: 'change-shape',
      suboptions: [
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'animal', label: 'Animal' },
      ],
    };
    let block = {
      actions: [
        { name: 'Change Shape', rules: [shaping] },
        { name: 'Other', rules: [shaping, { key: 'Note' }] },
      ],
    };

    assert.deepEqual(shapesOf(block), [
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'animal', label: 'Animal' },
    ]);
    assert.deepEqual(shapesOf(this.block), []);
  });

  test('what the game runs of one part', function (assert) {
    let runs = [
      { part: 'Strike Jaws' },
      { part: 'Jaws: Grab' },
      { part: 'Howl' },
    ];

    assert.deepEqual(runsOf(runs, 'Strike Jaws', 'Jaws'), runs.slice(0, 2));
  });

  test('a spellcasting entry is added, named for its tradition and type', function (assert) {
    let held = castingAdded(this.block).spellcasting[0];

    assert.deepEqual(held, {
      name: 'Arcane Innate Spells',
      tradition: 'arcane',
      type: 'innate',
      dc: 0,
      attack: 0,
      spells: {},
    });
    assert.strictEqual(
      castingName('divine', 'spontaneous'),
      'Divine Spontaneous Spells',
    );
  });

  test('a spell is added at its rank and removed, with how often it is cast', function (assert) {
    let block = spellAdded(castingAdded(this.block), 0, 3, 'Fireball');
    block = spellAdded(block, 0, 3, 'Haste');

    assert.deepEqual(block.spellcasting[0].spells, {
      3: ['Fireball', 'Haste'],
    });

    block = frequencySet(block, 0, 3, 1, '3');
    assert.deepEqual(block.spellcasting[0].uses, { Haste: 3 });
    assert.strictEqual(frequencyOf(block.spellcasting[0], 'Haste'), 3);

    block = frequencySet(block, 0, 3, 0, 'at will');
    assert.strictEqual(
      block.spellcasting[0].spells[3][0],
      'Fireball (At Will)',
    );
    assert.strictEqual(
      frequencyOf(block.spellcasting[0], 'Fireball (At Will)'),
      'at will',
    );
    assert.strictEqual(spellName('Fireball (At Will)'), 'Fireball');

    block = frequencySet(block, 0, 3, 0, '1');
    assert.strictEqual(block.spellcasting[0].spells[3][0], 'Fireball');

    block = spellRemoved(spellRemoved(block, 0, 3, 1), 0, 3, 0);
    assert.deepEqual(block.spellcasting[0].spells, {});
    assert.strictEqual(block.spellcasting[0].uses, undefined);
  });

  test('a spontaneous caster is given a slot at a rank it had none for', function (assert) {
    let block = castingAdded(this.block);
    block.spellcasting[0].type = 'spontaneous';

    block = spellAdded(spellAdded(block, 0, 0, 'Light'), 0, 1, 'Fear');
    assert.deepEqual(block.spellcasting[0].slots, { 1: 1 });
    assert.deepEqual(slotsSet(block, 0, 1, '3').spellcasting[0].slots, {
      1: 3,
    });
  });
});
