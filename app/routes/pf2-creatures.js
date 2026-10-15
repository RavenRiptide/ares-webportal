import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import DefaultRoute from 'ares-webportal/mixins/default-route';

// The creature library: your own saved creatures, those shared with you, the published ones and the
// bestiary, filtered by the query parameters.
export default Route.extend(DefaultRoute, {
  gameApi: service(),

  queryParams: {
    scope: { refreshModel: true },
    words: { refreshModel: true },
    level_from: { refreshModel: true },
    level_to: { refreshModel: true },
    page: { refreshModel: true },
  },

  model: function (params) {
    return this.gameApi.requestOne('pf2Creatures', params);
  },
});
