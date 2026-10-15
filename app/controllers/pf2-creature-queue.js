import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

export default class Pf2CreatureQueueController extends Controller {
  @service gameApi;
  @service router;
  @service flashMessages;

  @tracked notes = {};

  @action
  typed(id, event) {
    this.notes = { ...this.notes, [id]: event.target.value };
  }

  @action
  async decide(id, decision) {
    let answer = await this.gameApi.requestOne(
      'pf2CreatureReview',
      { id: id, decision: decision, note: this.notes[id] || '' },
      null,
    );
    if (answer.error) return;

    (answer.messages || []).forEach((one) => this.flashMessages.warning(one));
    this.flashMessages.success(
      `${answer.creature.name}: ${answer.creature.status}.`,
    );
    this.router.refresh('pf2-creature-queue');
  }
}
