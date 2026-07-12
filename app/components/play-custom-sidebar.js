import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import Controller from '@ember/controller';
import AuthenticatedController from 'ares-webportal/mixins/authenticated-controller';
import { computed, set } from '@ember/object';

export default Component.extend({
  gameApi: service(),
  gameSocket: service(),
  flashMessages: service(),
  showLFRP: false,
  router: service(),
  selectLFRP: false,
  hourOptions: [1, 2, 3],
  hours: 1,
  lfrpTxt: false,

  didInsertElement() {
    this._super(...arguments);
    this.setupCallback();
  },

  onLFRPActivity: function(type, msg, timestamp ) {
    let data = JSON.parse(msg);
    if (data.type == 'lfrp_set' || data.type == 'lfrp_expired') { //This probably doesn't fucking matter, they do the same thing
      this.set('model.custom.lfrp_icons', data.lfrp_icons);
    }
  },

  setupCallback: function() {
    let self = this;
    this.gameSocket.setupCallback('new_lfrp_activity', function(type, msg, timestamp) {
      self.onLFRPActivity(type, msg, timestamp) 
    } );
  },

  @action
    setSelectLFRP(value) {
      this.set('selectLFRP', value);
    },
  
  @action
  setShowLFRP(value) {
    this.set('showLFRP', value);
  },

  @action 
  hoursToLookChanged(newHoursToLook) {
    this.set('hours', newHoursToLook)
  },  

    @action
  setLFRP() {
    let api = this.get('gameApi');
    let hours = this.hours;
    let textType = this.lfrpTxt;
    this.set('selectLFRP', false);
    api.requestOne('setLFRP', {
      char_id: this.get('char.id'),
      hours: hours,
      textType: textType
    }, null)
    .then( (response) => {
        if (response.error) {
            return;
        }
      this.flashMessages.success(`Set to Looking for RP for ${hours} hour(s)!`);
    });
  },

  @action
  unsetLFRP() {
    let api = this.get('gameApi');
    api.requestOne('unsetLFRP', {
      char_id: this.get('char.id'),
    }, null)
    .then( (response) => {
        if (response.error) {
            return;
        }
      this.flashMessages.success('No longer Looking for RP!');
    });
  },
});