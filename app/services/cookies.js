import Service from '@ember/service';

export default Service.extend({
    
  // NOTE: All cookie values are stored as strings
  
  setMarkdownToolbarVisible(pref) {
    // Save toolbar cookie
    window.localStorage.setItem("aresmush:mdtools", pref);
  },
  
  markdownToolbarVisible() {
    return window.localStorage.getItem("aresmush:mdtools") || "true";
  }
     
});