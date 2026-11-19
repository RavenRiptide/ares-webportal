// Emblem of Ea: the player limit, death consent, and level range fields on the create and edit
// event pages. @event is any object with max_players, death_consent, min_level, and max_level;
// the fields write back to it.
//
// The tier table comes from the game (eventLevelTiers) so the label shown while picking matches
// the one the game will show once the event is saved.
import Component from '@ember/component';
import { inject as service } from '@ember/service';
import { action, computed, set } from '@ember/object';

// "T2-T3 (Levels 5-12)", "Any level (1-20)", "Levels 3-6", or "" for no range. Keep in step with
// EaEvents.level_range_label in the game.
function rangeLabel(min, max, tiers, cap) {
  if (!min && !max) {
    return '';
  }
  let low = Math.min(min || max, max || min);
  let high = Math.max(min || max, max || min);
  if (low === 1 && high === cap) {
    return `Any level (1-${cap})`;
  }
  let levels = low === high ? `Level ${low}` : `Levels ${low}-${high}`;
  let lowTier = tiers.find((t) => t.min === low);
  let highTier = tiers.find((t) => t.max === high);
  if (!lowTier || !highTier) {
    return levels;
  }
  let names = lowTier === highTier ? lowTier.name : `${lowTier.name}-${highTier.name}`;
  return `${names} (${levels})`;
}

export default Component.extend({
  tagName: '',
  gameApi: service(),
  tiers: null,
  cap: 20,
  wikiPage: null,
  wikiTitle: null,
  consentWikiPage: null,
  consentWikiTitle: null,

  init() {
    this._super(...arguments);
    this.set('tiers', []);
    this.gameApi.requestOne('eventLevelTiers', {}, null).then((response) => {
      if (response.error || this.isDestroyed) {
        return;
      }
      this.set('tiers', response.tiers || []);
      this.set('cap', response.cap || 20);
      this.set('wikiPage', response.wiki_page);
      this.set('wikiTitle', response.wiki_title);
      this.set('consentWikiPage', response.death_consent_wiki_page);
      this.set('consentWikiTitle', response.death_consent_wiki_title);
    });
  },

  levels: computed('cap', function () {
    return Array.from({ length: this.cap }, (_, i) => i + 1);
  }),

  minLevel: computed('event.min_level', function () {
    return parseInt(this.get('event.min_level')) || null;
  }),

  maxLevel: computed('event.max_level', function () {
    return parseInt(this.get('event.max_level')) || null;
  }),

  rangeLabel: computed('minLevel', 'maxLevel', 'tiers.[]', 'cap', function () {
    return rangeLabel(this.minLevel, this.maxLevel, this.tiers || [], this.cap);
  }),

  setRange(min, max) {
    set(this.event, 'min_level', min || '');
    set(this.event, 'max_level', max || '');
  },

  @action
  changeMin(e) {
    this.setRange(parseInt(e.target.value) || null, this.maxLevel);
  },

  @action
  changeMax(e) {
    this.setRange(this.minLevel, parseInt(e.target.value) || null);
  },

  // A tier sets the range to that tier, or, when the range is already on tier boundaries,
  // stretches it to take the tier in, so T2 then T3 gives T2-T3. Clear starts over.
  @action
  pickTier(tier) {
    let min = this.minLevel;
    let max = this.maxLevel;
    let onTiers =
      min && max && !(min === 1 && max === this.cap) &&
      this.tiers.some((t) => t.min === min) && this.tiers.some((t) => t.max === max);
    if (onTiers) {
      this.setRange(Math.min(min, tier.min), Math.max(max, tier.max));
    } else {
      this.setRange(tier.min, tier.max);
    }
  },

  @action
  pickAny() {
    this.setRange(1, this.cap);
  },

  @action
  clearRange() {
    this.setRange(null, null);
  },
});
