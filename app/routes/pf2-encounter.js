import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import DefaultRoute from 'ares-webportal/mixins/default-route';

// An encounter as the +e commands keep it: the order with each combatant's id, conditions, cover and
// what they have done this turn, and the encounter's log.
export default Route.extend(DefaultRoute, {
  gameApi: service(),

  model: function (params) {
    return this.gameApi.requestOne('pf2Encounter', { id: params['id'] });
  },
});
