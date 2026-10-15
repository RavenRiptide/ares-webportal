import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import DefaultRoute from 'ares-webportal/mixins/default-route';

// The viewer's last roll in an encounter, every modifier in it, as +e/why shows it.
export default Route.extend(DefaultRoute, {
  gameApi: service(),

  model: function () {
    return this.gameApi.requestOne('pf2LastRoll');
  },
});
