import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import DefaultRoute from 'ares-webportal/mixins/default-route';

// One creature, saved or from the bestiary: its stat block, how to add it, and for its author its notes
// and history. `ref` is `saved:12` or `bestiary:Goblin Warrior`.
export default Route.extend(DefaultRoute, {
  gameApi: service(),

  model: function (params) {
    return this.gameApi.requestOne('pf2Creature', { ref: params['ref'] });
  },
});
