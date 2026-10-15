import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import DefaultRoute from 'ares-webportal/mixins/default-route';

// The actions the viewer can use, by mode of play, with what each rolls and against what.
export default Route.extend(DefaultRoute, {
  gameApi: service(),

  model: function () {
    return this.gameApi.requestOne('pf2Actions');
  },
});
