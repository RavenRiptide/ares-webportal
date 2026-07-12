import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import DefaultRoute from 'ares-webportal/mixins/default-route';
import { action } from '@ember/object';

export default Route.extend(DefaultRoute, {
    gameApi: service(),

    model: function() {
      let api = this.gameApi;
      return api.requestOne('loginInfo');
    },
    
    activate: function() {
        this.controllerFor('application').set('hideSidebar', true);
    },

    @action 
    willTransition(transition) {
        this.controllerFor('application').set('hideSidebar', false);
    }
});
