/*
 *  ngramDBCreate.js (v) 1.0.0
 *
 *  A module to either create or open the ngram database
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

 "use strict";

// Add a Promise ngram.db property into the ngram object
function ngramCreateDatabase() {
  return new Promise(function (resolve, reject) {

    // Get the global ngram object
    var ngram = ngramGetGlobalObject();

    var DB_SPECS = ngram.DB_SPECS;

    var INDEX_WEIGHT = "weight_c";

    // Open the database GRAMS 1
    var DBOpenRequest = indexedDB.open(DB_SPECS.NAME, DB_SPECS.VERSION);

    // these event handlers act on the database being opened.
    DBOpenRequest.onerror = function(event) {
      reject("Cannot create or open the ngrambase");
    };

    DBOpenRequest.onsuccess = function(event) {
      resolve(DBOpenRequest.result);
    };

    DBOpenRequest.onupgradeneeded = function(event) {
      console.log("nGram databased needs an upgrade");

      var dbToUpdate = this.result;  // FIXME this? event
      console.warn(this, event, "FIXME this? event");
      var transaction = event.target.transaction;

      dbToUpdate.onerror = function(event) {
        reject("Error occurred while upgrading the ngrambase.");
      };

      var gSchema;
      var firstCreation = !dbToUpdate.objectStoreNames.contains(G_SCHEMA);

      if (firstCreation) {
        gSchema = dbToUpdate.createObjectStore(G_SCHEMA, {keyPath: "key"});
      }

      else {
        gSchema = transaction.objectStore(G_SCHEMA);
      }

      var now = new Date();

      if (firstCreation)
        gSchema.put({key: "created", value: now});

      gSchema.put({key: "updated", value: now});

      // Build n-gram objectstores

      // Add new n-gram store objects
      for (var n = 1; n <= DB_SPECS.MAX_GRAM; n++) {
        var storeName = NGRAM_STORENAME_PREFIX + n; // 3-gram => "g3"

        // 3 => ["$0", "$1", "$2"]
        var keys = (new Array(n)).fill("$").map(function(m, i) {
          return m + i;
        });

        var objectStore;

        if (dbToUpdate.objectStoreNames.contains(storeName)) {
          objectStore = transaction.objectStore(storeName);
        }

        else {
          objectStore = dbToUpdate.createObjectStore(storeName, {keyPath: keys});
        }

        if (! objectStore.indexNames.contains("n_minus_one")) {
          // 3 => ["$0", "$1", c, "$2"]
          var keysMinusOne = keys.slice();
          keysMinusOne.splice(n - 1, 0, "c");
          objectStore.createIndex("n_minus_one", keysMinusOne, {unique: false});
        }

        if (! objectStore.indexNames.contains("weight")) {
          // 3 => [c, "$0", "$1", "$2"]
          var keysWeight = keys.slice();
          keysWeight.splice(0, 0, "c");
          objectStore.createIndex("weight", keysWeight, {unique: false});
        }

        if (! objectStore.indexNames.contains("weight_c")) {
          objectStore.createIndex("weight_c", "c", {unique: false});
        }

        if (! objectStore.indexNames.contains("weight_c_nonUNIQUE")) {
          objectStore.createIndex("weight_c_nonUNIQUE", "c", {unique: false, multiEntry: true});
        }
      }

    };
  });
}
