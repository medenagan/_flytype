/*
 *  matcher.js (v) 1.0.0
 *
 *  A class to match similar words based on a dictionary and a similarity algorythm
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

 "use strict";

function Matcher(initialWords) {

  var DEFAULT_MAX_SUGGESTIONS = 6;
  var _cache = {};
  var _words = [];

  Object.defineProperty(this, "words", {
    get() {
      return _words;
    },

    set(newWords) {
      if (! Array.isArray(newWords))
        throw new Error("CFly.words must be an array of String");

      _words = newWords;
    }
  });

  if (initialWords) this.words = initialWords;

  function _getPattern (x, middle) {
    var patternCVC = /^([aeiou])([bcdfghjklmnpqrstvwxyz])[aeiou]/;
    var patternCC = /^([bcdfghjklmnpqrstvwxyz])([bcdfghjklmnpqrstvwxyz])/;
    var patternCCplus = /^([bcdfghjklmnpqrstvwxyz]{2,})/;
    var patternCdollar = /[bcdfghjklmnpqrstvwxyz]$/;
    //
    var patternShun = /^([aeiou])(?:tion|sion|cion|shun)/;

    var pos = 0;
    var length = x.length;

    var pattern = middle ? "" : "^";

    while (pos < length) {
      // Get the substring
      var sub = x.substr(pos);

      var rex;

      // shun -> tion/sion/cion
      rex = patternShun.exec(sub);
      if (rex) {
        pattern += (rex[1] + "(?:tion|sion|cion|shun)");
        pos += 5;
        continue;
      }

      // VCV -> VC(C)V "mater" "mat+er"
      rex =  patternCVC.exec(sub);
      if (rex) {
        pattern += (rex[1] + rex[2] + "+");
        pos += 2;
        continue;
      }

      // CC -> C(V)C suggest some vowels: "fr" "for"
      rex = patternCC.exec(sub);
      if (rex) {
        pattern += (rex[1] + "[aeiou]?" + rex[2]);
        pos += 2;
        continue;
      }

      // CC.. Any order
      rex =  patternCCplus.exec(sub);
      if (rex) {
        pattern += (rex[0]);
        pos += rex[0].length;
        continue;
      }

      // Ends in d, s, r or any consonants
      if (pos +1 === length && patternCdollar.test(sub)) {
        pattern += ("i?[eaiou]?" + sub);
        break;
      }

      // ELSE
      // Unrecognized letter or symbol
      {
        pattern += sub[0];
        pos +=1;
      }
    }
    return new RegExp(pattern, "i");
  };

  
  this.getMatches = function (radix) {
    // "cl" -> ["call", "called", "close", "clear", "cold", "calling"]

    console.log({radix});

    // Return no result in for "929"
    if (radix.length === 0 || /[0-9@]/.test(radix))
      return {words: [], index: -1};

    var res = {
      words: []
    };

    radix = radix.toLowerCase();

    if (_cache.hasOwnProperty(radix)) {
      var c = _cache[radix];
      return {words: c.words.slice(), index: c.index};
    }

    var pattern = _getPattern(radix);
    // Filter is faster than for(; ;)
    var filtered = _words.filter(function (x) {
      return pattern.test(x);
    });

    // If no or few results, tries Levenshtein
    if (filtered.length < DEFAULT_MAX_SUGGESTIONS) {
      console.time("lev");
      // Filter is faster than for(; ;)

      // Don't accept a distance greater than 2 ab origine
      var preLevenshteined = _words.filter(function (w) {
        var delta = radix.length - w.length;
        return (delta >= -2 && delta <= +2);
      });

      // [ [index of _words, distance], ...]
      var distances = preLevenshteined.map(function (w, i) {
        return [i, radix.levenshtein(w)];
      });

      //var sorted = _words.slice();
      distances.sort(function (a, b) {
        if (a[1] === b[1]) {
          // Same distance, most frequent first
          return (a[0] - b[0]);
        }
        else {
          // Nearer one
          return (a[1] - b[1]);
        }
      });
      console.timeEnd("lev");
      var logDistances = distances.slice(0, 100000).map(k => [preLevenshteined[k[0]], k[0], k[1]]);
      console.log(JSON.stringify(radix), filtered,  "less than MAX", logDistances.length);


      res.words = filtered.concat(distances.slice(0, DEFAULT_MAX_SUGGESTIONS - filtered.length).map(function (m) {
        return preLevenshteined[m[0]];
      }));
    }

    else {
      // Slice up to DEFAULT_MAX_SUGGESTIONS
      res.words = filtered.slice(0, DEFAULT_MAX_SUGGESTIONS);
    }

    // If the exact typed word is inside of this list, assume it as index
    var index = res.words.findIndex(function (a) {return a.toLowerCase() === radix});
    if (index > -1) res.index = index;

    // Cache
    _cache[radix] = {words: res.words.slice(), index: res.index};

    return res;
  }
}
