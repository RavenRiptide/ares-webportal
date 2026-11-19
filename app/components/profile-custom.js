import Component from '@ember/component';
import { action } from '@ember/object';

export default Component.extend({
  tagName: '',
  registrationShown: false,

  @action
  reloadChar() {
    this.onReloadChar();
  },

  @action
  toggleRegistration() {
    this.set('registrationShown', !this.registrationShown);
  }
});
