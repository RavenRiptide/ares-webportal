import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

// The scene's Play menu, as this game adds to it: a link to the encounter running in the scene, asked for
// each time the menu opens.
export default class LiveSceneCustomPlay extends Component {
  @service gameApi;

  @tracked encounter = null;

  constructor(owner, args) {
    super(owner, args);
    this.load();
  }

  async load() {
    let answer = await this.gameApi.request('pf2SceneEncounter', {
      scene_id: this.args.scene?.id,
    });
    if (!this.isDestroying && !this.isDestroyed && answer?.id)
      this.encounter = answer;
  }
}
