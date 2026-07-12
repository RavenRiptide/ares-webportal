import Controller from '@ember/controller';
import { reads } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import ConfirmAction from 'ares-webportal/mixins/confirm-action';

export default Controller.extend(ConfirmAction, {    
  gameApi: service(),
  flashMessages: service(),
  router: service(),
  configErrors: null,  
    
  config: reads('model.config'),
    
  resetOnExit: function() {
    this.hideActionConfirmation();
    this.set('configErrors', null);
  },
    
  @action
  restoreDefaults() {
    let api = this.gameApi;
    this.hideActionConfirmation();
    api.requestOne('restoreConfig', { file: this.get('model.file') }, null)
    .then( (response) => {
      if (response.error) {
        return;
      }
      
      this.flashMessages.success('Config restored!');
      this.send('reloadModel');
    });  
  },
  
        
  @action
  save() {
    let api = this.gameApi;
    let modelConfig = this.get('model.config');
    let config = {};
            
    Object.keys(modelConfig).forEach( function(k) {
      config[k] = modelConfig[k].new_value;
    });

    api.requestOne('saveConfig', { file: this.get('model.file'), config: config }, null)
    .then( (response) => {
      if (response.error) {
        return;
      }
      if (response.warnings) {
        this.set('configErrors', response.warnings);
        return;
      }
        
      this.flashMessages.success('Config saved!');
      this.router.transitionTo('setup');  
    });  
  }      
});