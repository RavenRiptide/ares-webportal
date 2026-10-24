import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class Pf2CreatureNewController extends Controller {
  @service gameApi;

  queryParams = ['from', 'level', 'words', 'road_map'];

  @tracked from = null;
  @tracked level = null;
  @tracked words = null;
  @tracked road_map = null;

  @tracked search = '';
  @tracked found = [];
  @tracked blankLevel = '1';
  @tracked described = '';
  @tracked roadMapLevel = '1';
  @tracked roadMapName = null;

  get roadMaps() {
    return this.model.options?.road_maps || [];
  }

  // The chosen road map, the first until one is chosen, with GM Core's words for it.
  get roadMap() {
    return (
      this.roadMaps.find((one) => one.name === this.roadMapName) ||
      this.roadMaps[0]
    );
  }

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
  begin(from, level, words, roadMap) {
    this.from = from;
    this.level = level || null;
    this.words = words || null;
    this.road_map = roadMap || null;
  }

  @action
  beginFromRoadMap() {
    this.begin('road_map', this.roadMapLevel, null, this.roadMap?.name);
  }
}
