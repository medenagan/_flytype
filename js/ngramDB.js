/*
 *  ngramDB.js (v) 1.0.0
 *
 *  Main module providing the global ngram object allowing memorizing n-grams into an indexDB
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */


"use strict";

const BEING_WORKER = (typeof importScripts !== "undefined");
const REGEX_WORD_G = /[A-Za-zÀ-ÖØ-öĀ-ſ]+(?:[-'][A-Za-zÀ-ÖØ-öĀ-ſ]+)?/g; // "abc" | "ab-c" | "a'bc"


// Expecting lib.js already loaded if matcherThread is used as content script
if (BEING_WORKER) {
  importScripts("ngramDBCreate.js");
  importScripts("ngramDBRead.js");
}

function ngramGetGlobalObject() {
  console.log("First call");

  // Use one DB_SPECS only
  const DB_SPECS = ({
    "1" : {NAME: "GRAMS", VERSION: 1, MAX_GRAM: 3},
    "DEBUG" : {NAME: "GRAMS_DEBUG_jimbal", VERSION: 6, MAX_GRAM: 5}
  })["DEBUG"];

  var ngram = {
      STORENAME_PREFIX: "g", // g5
      STORENAME_REGEX: /^g\d+$/, //g0, g1, ...
      DEFAULT_MAX_READING_RESULTS: 20,
      DB_SPECS: DB_SPECS,
      REGEX_WORD_SEPARATOR: REGEX_WORD_G
  };

  // Next calls return the same ngram object
  ngramGetGlobalObject = function () {
    console.log("second call", Date.now())
    return ngram;
  }


  // Headers
  const G_SCHEMA = "g_schema";








  console.log(self);

  var global = (typeof window !== "undefined") ?
    window :
    self;

  var indexedDB = global.indexedDB;



  var promisedDb = ngramCreateDatabase();

  Object.defineProperty(ngram, "db", {
    get () {
      return promisedDb;
    }
  });

  // Open or create the database

  var _db;
  var db;



  promisedDb.then(function (db) {
    db = _db = db;
  }, console.error);


  ngram.isWorker = (typeof WorkerGlobalScope !== "undefined" && global instanceof WorkerGlobalScope);







  // Exports
  ngram.excerptText = _excerptText;
  ngram.flush = _flush;







   /*
     {
       all: true, // calculates all data
       limC: true, // calculate minC and maxC
       csv: true, // export to csv
       json: true, // export to json
   */

  ngram.getInfo = function (options, callback) {
    if ( ! (callback instanceof Function)) return;

    if (! _db) {
      callback.call(null, {error: true, detail: "Database not ready yet"});
      return;
    }

    if (! (options instanceof Object)) options = {all: true};

    options.limC = options.limC || options.all;

    const storeNames = Array.prototype.slice.call(_db.objectStoreNames);
    console.time("gioco9");
    // {arrGram: [1, 2, 3], minGram: 1, maxGram: 3, continuous: true, details: {1: {...}}};
    const res = {minGram: 0, maxGram: 0, continuousGram: false};
    var arrGram = res.arrGram = [];
    var details = res.details = {};

    // [1, 2, 3] n-gram
    storeNames.forEach(function (o){
      var matched = o.match(STORENAME_REGEX);
      if (matched) {
        // n
        arrGram.push(+matched[1]);
      }
    });

    arrGram.sort(function (a, b) {
      return a - b;
    });

    if (arrGram.length) {
      res.minGram = arrGram[0];
      res.maxGram = arrGram[arrGram.length - 1];
      // true: [1, 2, 3];  false: [1, 3]
      res.continuousGram = (res.maxGram - res.minGram + 1) === arrGram.length;
    }


    var transaction = _db.transaction(_db.objectStoreNames);

    transaction.oncomplete = function () {
      // Export via CSV?
      if (options.csv) {
        toBlobFile(JSON.stringify(data));
      }

       console.timeEnd("gioco9");

      callback.call(null, res);
    };

    const KEYRANGE_GREATER_THAN_ZERO = IDBKeyRange.lowerBound(0, true);
  //   const KEYRANGE_GREATER_THAN_ZERO = IDBKeyRange.lowerBound(0, true);

    arrGram.forEach(function (n) {
      var objStore = transaction.objectStore(NGRAM_STORENAME_PREFIX + n);
      var nDetail = details[n] = {};
      // Copy all data
      if (options.csv || options.json) {
        var records = nDetail.records = [];
        objStore.index("n_minus_one").openCursor().onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
            records.push(cursor.value);
            cursor.continue();
          }
        };
      }

      // Record count (use object store as it's faster than index)
      objStore.count().onsuccess = function (e) {
        nDetail.length = e.target.result;
      };

      // Min and Max occurrencies
      if (options.limC) {
        var nIndex = objStore.index(INDEX_WEIGHT);

        var mcbMinMax = new CMultiCallbackHelper();

        // c > 0
        nIndex.get(IDBKeyRange.lowerBound(0, true)).onsuccess = mcbMinMax.callback(function (e) {
          nDetail.minC = (e.target.result) ? (e.target.result.c) : (0);
        });

        nIndex.openCursor(null, "prev").onsuccess = mcbMinMax.callback(function(e) {
          nDetail.maxC = (e.target.result) ? (e.target.result.key) : (0);
        });

        mcbMinMax.once(function () {
          var minC = nDetail.minC;
          var maxC = nDetail.maxC;
          var done = maxC - minC;
          // Count of length for each ocCurrencies c
          nDetail.totC = 0;
          var arrC = nDetail.arrC = [0];
          var arrIndexC =  nDetail.arrIndexC = [];
          var arrfd =  nDetail.arrfd = [];
          var rank = 0;
          var nOccurrences = 0;
          var nLength = 0;
          for (let c = maxC; c >= minC; c--) {
            nIndex.count(c).onsuccess = (function (e) {
              nDetail.totC += arrC[c] = (c * e.target.result);
              var length = e.target.result;
              if (length) arrIndexC.push({rank: ++rank, occurrences: c, length: length });
              nOccurrences += c;
              //nLength += c * length;
              if (! done--) console.log("PSEUDOPARTIAL", "c", nOccurrences, "l", nLength);
            });
          }
        });
      }
  /*
      // Occurrencies count NEWWWWW
      var nIndex = objStore.index(INDEX_WEIGHT);

      // Gram count
      nIndex.count().onsuccess = function (e) {
        nDetail.count = e.target.result;
      };

  */
    });
  };

  // write([string], count)
  function _write(strings, count) {
    // Do we have n-gram table?
    if (strings.length > DB_SPECS.MAX_GRAM) {
      console.error("Cannot write " + strings.length + "-gram [" + strings + "] since MAX_GRAM is " + DB_SPECS.MAX_GRAM);
      return;
    }

    const storeName = "g" + strings.length;

    var transaction = db.transaction(storeName, "readwrite");

    // report on the success of opening the transaction
  /*
    transaction.oncomplete = function(event) {
      console.log("Transaction completed: database modification finished.");
    };
  */

    transaction.onerror = function(event) {
      console.error("transaction.onerror: duplicate?", event);
    };


    var objectStore = transaction.objectStore(storeName);

    var osGetRequest = objectStore.get(strings);
    osGetRequest.onsuccess = function(event) {
      const entry = {c: count || 1};
      // ["the", "task"] => {$0: "the", $1: "task", c: count}
      strings.forEach(function (s, i) {
        entry["$" + i] = s;
      });
      // If updating an existing entry, sums the counts up
      if (osGetRequest.result) entry.c += osGetRequest.result.c;

      // Write on database
      var osPutRequest = objectStore.put(entry);
  /*
      osPutRequest.onsuccess = function(event) {
        console.log("put with success", entry);
      };
  */

      osPutRequest.onerror = function(event) {
        console.error("osPutRequest.onerror", osPutRequest.error);
      };
    };

  }


  // write(n-gram, [{key: [string, string, ...], count: 1}]
  function _writeList(n, list) {
    const storeName = "g" + n;

    var transaction = _db.transaction([storeName, G_SCHEMA], "readwrite");


    transaction.oncomplete = function(event) {
      console.log("Transaction completed: database modification finished.", list.length);
    };

    transaction.onerror = function(event) {
      console.error("transaction.onerror: duplicate?", list.length);
    };

    var objectStore = transaction.objectStore(storeName);

    var gSchemaStore = transaction.objectStore(G_SCHEMA);

    var n_occurrences = 0;

    // Requirement to use one transaction only for updating multiple entries is
    // that we read the same key once, so [{key: "the": count: 3}, {key: "the": count: 2} ...]
    // must be pretransformed in [{key: "the": count: 5}, ...]

    list.forEach(function (l) {
      // l = {key: [string, string, ...], count: 1+}
      var osGetRequest = objectStore.get(l.key);

      n_occurrences += l.count;

      osGetRequest.onsuccess = function(event) {
        const entry = {c: l.count};

        // ["the", "task"] => {$0: "the", $1: "task", c: count}
        l.key.forEach(function (s, i) {
          entry["$" + i] = s;
        });

        // If updating an existing entry, sums the counts up
        if (osGetRequest.result) entry.c += osGetRequest.result.c;

        // Write on database
        var osPutRequest = objectStore.put(entry);
  /*
        osPutRequest.onsuccess = function(event) {
          console.log("put with success", entry);
        };
  */

        osPutRequest.onerror = function(event) {
          console.error("osPutRequest.onerror", osPutRequest.error);
        };
      };

    });

    // Sum occurrences of n-grams
    gSchemaStore.get(storeName).onsuccess = function (e) {
      var result = e.target.result;
      if (result && Number.isFinite(result = result.occurrences) && (result > 0)) n_occurrences += result;
      gSchemaStore.put({key: storeName, occurrences: n_occurrences});
    }




  }

  // [["a", "white", "cat"], ["it's", "raining"]]
  const cache_words = [];

  const LAZY_FLUSH_TIMEOUT = 5 * 60 * 1000; // 5 mins

  var last_flush = 0;

  function _excerptText(text, callback) {
    if (! (typeof text === "string")) return;

    // "This is 1 text?" => ["this", "is", "text"]
    var words = text.match(REGEX_WORD_G);

    if (callback instanceof Function) callback.call(null, {success: true, length: words.length});

    if (! words) return;

    cache_words.push(words.map(function (m) {
      return m.toLowerCase();
    }));

    var now = Date.now();

    // In case the system date goes backwards, assume timeout passed
    if ((now - last_flush > LAZY_FLUSH_TIMEOUT) || (now < last_flush)) {
      console.log("Flushing");
      last_flush = now;
     _flush();
    }

    else {
      console.log("don't flush", Date.now());
    }
  }

  function _flush () {
    var shadowCache = cache_words.splice(0, cache_words.length);
    for (var n = 1; n <= DB_SPECS.MAX_GRAM; n++) {
      // [ ["the", "first"], ["first", "time"], ...] => {"the|first": 1, "first|timr": 1}
      var dict = {};
      shadowCache.forEach(function (words) {
        aSplitNGram(words, n).forEach(function (gram) {
          var key = gram.join("|");
          dict[key] = 1 + (dict[key] || 0);
        });
      });
      // FIXME
      var ngrams = Object.keys(dict).map(function (k) {
        return {key: k.split("|"), count: dict[k]}
      });
      console.log(n, ngrams.slice(0, 100));
      _writeList(n, ngrams);
    }
  }


  function aSplitNGram(source, n) {

    const SIZE = source.length + 1 - n;

    var dest = [];

    for (var i = 0; i < SIZE;  i++) {
      dest.push(source.slice(i, i + n));
    }

    return dest;
  }


  function toBlobFile (text) {
    var blob = new Blob([text], {type: "text/csv;charset=utf-8;"}); // Does not save without csv, for example application/json not working
    global.open(URL.createObjectURL(blob));
  }


  function write (text) {
    _write(text.split(" "), 1);
  }

  ngram.write = write;

  return ngram;



}


var ngram = ngramGetGlobalObject();



/*

navigator.webkitPersistentStorage

navigator.webkitTemporaryStorage.queryUsageAndQuota (
    function(usedBytes, grantedBytes) {
        console.log('we are using ', usedBytes, ' of ', grantedBytes, 'bytes');
    },
    function(e) { console.log('Error', e);  }
);

*/














"Bloccone chiuso";
///////////////////////////////////////////////////////////////////////////////////////

ngram.getInfo(console.log);

console.log("ngram", ngram);
