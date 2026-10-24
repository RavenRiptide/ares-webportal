import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import DefaultRoute from 'ares-webportal/mixins/default-route';

// For admins: the creatures awaiting approval.
export default Route.extend(DefaultRoute, {
  gameApi: service(),

  model: function () {
    return this.gameApi.requestOne('pf2CreatureQueue', {}, 'pf2-creatures');
  },
});
