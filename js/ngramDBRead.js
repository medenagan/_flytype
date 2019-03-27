/*
 *  ngramDBRead.js (v) 1.0.0
 *
 *  A module providing reading methods for the ngrambase
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

"use strict";

// Add getNPlusOneFromArray() and getNPlusOneFromString() to the ngram object
(function() {

  var ngram = ngramGetGlobalObject();

  var REGEX_WORD_SEPARATOR = ngram.REGEX_WORD_SEPARATOR;

  // (["the", "first"]) => [ ["the", "first", "time"], ["the", "first", "thing"], ...] FIXME
  function getNPlusOneFromArray(gram, max, send) {

    console.log("YYYYYYYY")

    return ngram.db.then(
      function(db) {
        return _getNPlusOneFromArray(db, gram, max);
      }
    );
  }

  function _getNPlusOneFromArray(db, gram, max) {

    if (! Array.isArray(gram))
      return Promise.reject("Expecting gram as [array]");

    if (max != +max) {
      max = ngram.DEFAULT_MAX_READING_RESULTS;
    }

    // Filter all grams+1 having the given gram as prefix
    var fromGram = gram.slice().concat(1, "");
    var toGram = gram.slice().concat(Infinity, "\uffff");
    var keyRangeValue = IDBKeyRange.bound(fromGram, toGram);

    // Open the store for reading
    var storeName = ngram.STORENAME_PREFIX + (gram.length + 1);
    var transaction = db.transaction(storeName);
    var objectStore = transaction.objectStore(storeName);

    // An array of grams+1
    var results = [];

    // Fill results
    var request = objectStore.index("n_minus_one").openCursor(keyRangeValue, "prev");
    request.onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor && results.push(cursor.value) < max) {
        cursor.continue();
      }
    };

    return new Promise(function(resolve, reject) {
      transaction.oncomplete = function(event) {
        var pretty = results.map(_rawGramToPretty);
        console.log(pretty)
        resolve(pretty);
      };

      transaction.onerror = function(event) {
        reject("Error in transaction");
      };
    });
  }

  function _rawGramToPretty(raw) {
    // {c: 35, $0: "a", $1: "dream"} => {words: ["a", "dream"], count: 35, n: 2}
    var words = [];
    Object.getOwnPropertyNames(raw).forEach(function (property) {
      if (property.startsWith("$")) {
        words[property.substr(1)] = raw[property];
      }
    });
    return {
      words: words,
      count: +raw.c,
      n: words.length
    };
  }

  function getNPlusOneFromString(text, max) {
    var gram = (text.match(REGEX_WORD_SEPARATOR) || []).map(function (word) {
      return word.toLowerCase();
    });
    return getNPlusOneFromArray(gram, max);
  }

  // Export
  ngram.getNPlusOneFromArray = getNPlusOneFromArray;
  ngram.getNPlusOneFromString = getNPlusOneFromString;
})();
