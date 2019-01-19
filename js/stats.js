/*
 *  stats.js (v) 1.0.0
 *
 *  Module providing easy abstraction for statistcs
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

"use strict";

/*
  replacedWords: number of words FlyType has replaced:
   "busi" -> "business" = +1

  savedKeys: number of characters FlyType has saved.
            It's defined as the Levenshtein distance between the initial word
            typed by the user and the word that FlyType actually replaced
   "busi" -> "business" = +4

  pressedKeys: number of (printable) keys typed in general, even if no replace occurs (but fly must be on)
   "DNA" = +3
*/


var stats = (typeof stats !== "undefined") ? stats : (function () {

  var storageArea = meta.chrome.storage.local;
  var VERSION = meta.chrome.runtime.getManifest().version;

  var data = {
    replacedWords: 0,
    savedKeys: 0,
    pressedKeys: 0
  };

  var instance = {};

  // Convert each raw data property into a public setter
  Object.keys(data).forEach(function (key) {
    Object.defineProperty(instance, key, {

      get() {
        return 0; // stats.prop += ... won't hurt
      },

      set(value) {
        if (Number.isFinite(value) && value > 0) {
          data[key] += value;
          changed(value);
        }
        else {
          console.warn("stats." + key + " refused", value);
        }
      }

    });
  });

  // Accumulate and save
  var counter = 0;
  function changed(amount) {

    counter += amount;
    if (true || counter > 10) { // FIXMED
      saveStats();
      counter = 0;
    }
    else {
      console.log("Counter is", counter)
    }
  }

  function clearStats(callback) {
    if (typeof callback !== "function")
      callback = null;

    storageArea.remove(["stats"], callback);
  }

  function normalizeStats(raw) {
    var normalized = (typeof raw === "object") ?
      (raw) :
      ({
        version: VERSION,
        created: (new Date()).toJSON()
      });

      return normalized;
  }

  function readStats(callback) {
    storageArea.get(["stats"], function(result) {
      callback.call(null, normalizeStats(result.stats));
    });
  }

  var busy = false;

  function saveStats() {

    if (busy) {
      setTimeout(saveStats, 5);
      return;
    }

    busy = true;

    readStats(function(storageStats) {

      Object.keys(data).forEach(function (key) {

        var originalValue = storageStats[key];

        var addingValue = data[key];
        data[key] = 0;

        if (! Number.isFinite(originalValue))
          originalValue = 0;

        storageStats[key] = originalValue + addingValue;
      });

      storageStats.updated = (new Date()).toJSON();

      console.log("ABOUT TO SAVE", storageStats);

      storageArea.set({stats: storageStats}, function () {
        busy = false;
      });
    });
  }

  function listenToStats(callback) {

    if (typeof callback !== "function")
      throw new Error("stats.listen needs a callback")

    meta.chrome.storage.onChanged.addListener(function (changes, area) {
      if (changes && changes.hasOwnProperty("stats") && meta.chrome.storage[area] === storageArea) {
        callback.call(null, normalizeStats(changes.stats.newValue));
      }
    });
  }

  instance.clear = clearStats;
  instance.read = readStats;
  instance.save = saveStats;
  instance.listen = listenToStats;

  return instance;

})();
