"use strict";

var settings = (typeof settings !== "undefined") ? settings : (function () {

  console.log("SYD", typeof syd);

  var syd = true;

  var storageArea = meta.chrome.storage.local;
  var VERSION = meta.chrome.runtime.getManifest().version;

  // Default values
  var DEFAULT_SUGGESTIONS = 6;
  var MAX_SUGGESTIONS = 6;
  var MIN_SUGGESTIONS = 1;

  var cached = normalizeSettings();

  function normalizeSettings(raw) {
    var normalized = (typeof raw === "object") ?
      (raw) :
      ({
        version: VERSION,
        created: (new Date()).toJSON()
      });

    normalized.maxSuggestions = (Number.isFinite(normalized.maxSuggestions)) ?
      Math.max(MIN_SUGGESTIONS, Math.min(MAX_SUGGESTIONS, Math.floor(normalized.maxSuggestions))) :
      DEFAULT_SUGGESTIONS;

    normalized.paused = !!normalized.paused;

    return normalized;
  }

  function listenToSettings(callback) {

    if (typeof callback !== "function")
      throw new Error("settings.listen needs a callback")

    meta.chrome.storage.onChanged.addListener(function (changes, area) {
      if (changes && changes.hasOwnProperty("settings") && meta.chrome.storage[area] === storageArea) {
        var oldNormalized = normalizeSettings(changes.settings.oldValue);
        var newNormalized = normalizeSettings(changes.settings.newValue);
        cached = newNormalized;
        callback.call(null, oldNormalized, newNormalized);
      }
    });
  }

  function readSettings(callback) {
    storageArea.get(["settings"], function(result) {
      var normalized = normalizeSettings(result.settings);
      cached = normalized;
      callback.call(null, normalized);
    });
  }

  // readSettings(function () {/* read first time and cache */});
  ////listenToSettings(function () {/* read first time and cache */});

  function writeSettings(changes) {

    readSettings(function (readSettings) {

      var settingsToWrite = normalizeSettings(
        Object.assign(readSettings, changes)
      );

      settingsToWrite.updated = (new Date()).toJSON();

      storageArea.set({settings: settingsToWrite});
    });
  }

  var instance = {
    read: readSettings,
    listen: listenToSettings
  };

  Object.defineProperty(instance, "paused", {

    get() {
      return cached.paused;
    },

    set(value) {
      writeSettings({paused: value});
    }
  });

  return instance;

})();


console.log("SIDDARTHA");

settings.listen(function(data) {
  console.log("Settings have changed", data);
});
