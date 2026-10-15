import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class Pf2CreatureNewController extends Controller {
  @service gameApi;

  queryParams = ['from', 'level', 'words'];

  @tracked from = null;
  @tracked level = null;
  @tracked words = null;

  @tracked search = '';
  @tracked found = [];
  @tracked blankLevel = '1';
  @tracked described = '';

  get start() {
    let start = this.model.start;
    return start && start.block
      ? { block: start.block, cloned_from: start.cloned_from, name: '' }
      : null;
  }

  @action
  typed(field, event) {
    this[field] = event.target.value;
  }

  @action
  async look(event) {
    event.preventDefault();
    // Their own first, then the published, then the bestiary's.
    let lists = await Promise.all(
      ['mine', 'published', 'bestiary'].map((scope) =>
        this.gameApi.requestOne(
          'pf2Creatures',
          { scope, words: this.search },
          null,
        ),
      ),
    );
    this.found = lists.flatMap((one) => one.creatures || []).slice(0, 12);
  }

  @action
  begin(from, level, words) {
    this.from = from;
    this.level = level || null;
    this.words = words || null;
  }
}
