import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';

// What an author does to one of their own from its page: submit it for approval, withdraw the request,
// retire or restore it, and share it.
export default class Pf2CreatureController extends Controller {
  @service gameApi;
  @service router;
  @service flashMessages;

  @tracked note = '';
  @tracked shareNames = null;
  @tracked plotmasters = null;

  get creature() {
    return this.model.creature;
  }

  get submitted() {
    return this.creature.status === 'submitted';
  }

  get retired() {
    return this.creature.status === 'retired';
  }

  get shareText() {
    return this.shareNames ?? (this.model.shared_with || []).join(', ');
  }

  get sharedWithPlotmasters() {
    return this.plotmasters ?? this.creature.audience === 'plotmasters';
  }

  @action
  typed(field, event) {
    this[field] = event.target.value;
  }

  @action
  toggle(event) {
    this.plotmasters = event.target.checked;
  }

  async act(act, more = {}) {
    let answer = await this.gameApi.requestOne(
      'pf2CreatureAct',
      { id: this.creature.id, act: act, ...more },
      null,
    );
    if (answer.error) return;

    this.flashMessages.success(
      `${this.creature.name}: ${answer.creature.status}.`,
    );
    this.router.refresh('pf2-creature');
  }

  @action
  submit() {
    this.act('submit', { note: this.note });
  }

  @action
  withdraw() {
    this.act('withdraw');
  }

  @action
  retire() {
    this.act(this.retired ? 'restore' : 'retire');
  }

  @action
  share(event) {
    event.preventDefault();
    let names = this.shareText
      .split(',')
      .map((one) => one.trim())
      .filter((one) => one.length);
    this.act('share', { plotmasters: this.sharedWithPlotmasters, with: names });
  }
}
