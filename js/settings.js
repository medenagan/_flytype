"use strict";

(function (root) {
  // global defined in ext.js
  if (! root) root = global;

  if (root.settings) return;
  
  // Default values
  const DEFAULT_SUGGESTIONS = 6;
  const MAX_SUGGESTIONS = 6;
  const MIN_SUGGESTIONS = 1;
  
  root.settings = normalizeSettingsValues(); // {... default}


  meta_chrome.storage.local.get("settings", function (result) {
    if (meta_chrome.lastTimeError) {
      console.log(meta_chrome.lastTimeError);
      return;
    }
    // FIXME ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    console.log(result.settings);
  });

  // Every content script can use settings in read-only mode to know the last user values
  meta_chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === "sync" && changes.settings) {
      // FIXME ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
      gotSettingsFromStorage(changes.settings.newValue);
    }
    else {
      console.log(changes, namespace, "boh");
    }
  });  
  
  // Load for the first time
  meta_chrome.storage.sync.get("settings", function (result) {
    if (meta_chrome.lastTimeError) {
      console.error(meta_chrome.lastTimeError);
    }
    else {
      gotSettingsFromStorage(result.settings);
    }
  });


  // Set the settings shadow copy on scope
  function gotSettingsFromStorage(data) {
    root.settings = normalizeSettingsValues(data);
    console.log("got settings: ", root.settings);
    if (root.onSettingsChanged instanceof Function) root.onSettingsChanged(root.settings);
  }
  
  function normalizeSettingsValues(obj) {
    if (! (obj instanceof Object)) obj = {};
    
    // maxSuggestions
    if (Number.isFinite(obj.maxSuggestions)) {
      // | 0 = Math.floor 32bit
      obj.maxSuggestions = Math.max(MIN_SUGGESTIONS, Math.min(MAX_SUGGESTIONS, obj.maxSuggestions | 0));
    }
    else{
      obj.maxSuggestions = DEFAULT_SUGGESTIONS;
    }       

    return obj;    
  }

})();

function onSettingsChanged(pippo) {
  console.log("Tolomeo", pippo, typeof pippo);
}
