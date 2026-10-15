import Controller from '@ember/controller';

export default class Pf2CreatureEditController extends Controller {
  get start() {
    let found = this.model.creature;
    if (!found || !found.block) return null;

    return {
      id: found.creature.id,
      name: found.creature.name,
      block: found.block,
      notes: found.notes,
      revision: found.editing_revision,
    };
  }
}
