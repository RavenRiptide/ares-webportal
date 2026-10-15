import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RSVP from 'rsvp';
import DefaultRoute from 'ares-webportal/mixins/default-route';

// The editor on a saved creature of yours, as its latest revision stands.
export default Route.extend(DefaultRoute, {
  gameApi: service(),

  model: function (params) {
    return RSVP.hash({
      options: this.gameApi.requestOne('pf2CreatureOptions'),
      creature: this.gameApi.requestOne(
        'pf2Creature',
        { ref: params['ref'] },
        'pf2-creatures',
      ),
    });
  },
});
