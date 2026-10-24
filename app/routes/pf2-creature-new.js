import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import RSVP from 'rsvp';
import DefaultRoute from 'ares-webportal/mixins/default-route';

// A new creature: from a creature that exists, from a pasted description, from one of GM Core's road maps
// at a level, or blank at a level, and then the editor. `from` with `level`, `words` or `road_map` say how;
// with none, the page offers the ways to begin.
export default Route.extend(DefaultRoute, {
  gameApi: service(),

  queryParams: {
    from: { refreshModel: true },
    level: { refreshModel: true },
    words: { refreshModel: true },
    road_map: { refreshModel: true },
  },

  model: function (params) {
    let options = this.gameApi.requestOne('pf2CreatureOptions');
    let start = params.from
      ? this.gameApi.requestOne(
          'pf2CreatureStart',
          {
            from: params.from,
            level: params.level,
            words: params.words,
            road_map: params.road_map,
          },
          'pf2-creatures',
        )
      : null;

    return RSVP.hash({ options: options, start: start });
  },
});
