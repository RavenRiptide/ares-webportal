import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class Pf2CreaturesController extends Controller {
  queryParams = ['scope', 'words', 'level_from', 'level_to', 'page'];

  @tracked scope = 'mine';
  @tracked words = '';
  @tracked level_from = '';
  @tracked level_to = '';
  @tracked page = 1;

  // What is typed in the filters, applied only on Search so the list does not reload on each key.
  @tracked typedWords = '';
  @tracked typedFrom = '';
  @tracked typedTo = '';

  get scopeNames() {
    return {
      mine: 'Mine',
      shared: 'Shared with me',
      published: 'Published',
      bestiary: 'Bestiary',
      all: 'All',
    };
  }

  get onBestiary() {
    return this.model.scope === 'bestiary';
  }

  get hasPrevious() {
    return this.model.page > 1;
  }

  get hasNext() {
    return this.model.page < this.model.pages;
  }

  @action
  typed(field, event) {
    this[field] = event.target.value;
  }

  @action
  search(event) {
    event.preventDefault();
    this.words = this.typedWords;
    this.level_from = this.typedFrom;
    this.level_to = this.typedTo;
    this.page = 1;
  }

  @action
  turn(by) {
    this.page = Number(this.model.page) + by;
  }
}
