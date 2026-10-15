import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class Pf2EncounterController extends Controller {
  @service router;

  @action
  refresh() {
    this.router.refresh('pf2-encounter');
  }
}
