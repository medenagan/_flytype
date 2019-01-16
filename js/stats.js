"use strict";

/*

Stats:

replacedWords: number of words FlyType has replaced:
 "busi" -> "business" = +1

savedKeys: number of characters FlyType has saved. It's defined as the Levenshtein distance between the initial word typed by the user and the word that FlyType actually replaced
 "busi" -> "business" = +4

pressedKeys: number of keys typed in general, even if not replace occurs
  "DNA" = +3



*/


(function () {
  if (window.Stats) console.warn("Stats seems already defined");

  var data = {
    replacedWords: 0,
    savedKeys: 0,
  };

  // {here} represents an abstract instance of Stats. Get properties return 0 as {here} doesn't know about globals stats
  // both Stats.here.myProp = 2 and Stats.here.myProp += 2 do the same thing, though the first is faster

  var here = {
    get replacedWords() {
      return 0;
    },

    set replacedWords(n) {
       data.replacedWords += n;
    },

    get savedKeys() {
      return 0;
    },

    set savedKeys(n) {
       data.savedKeys += n;
    }
  };

  Object.freeze(here);


  function add(obj) {
    obj = obj || {};

    data.replacedWords += obj.replacedWords || 0;
    data.savedKeys += obj.savedKeys || 0;

    return {
      replacedWords: 0,
      savedKeys: 0,
    };
  }



  function log() {
    console.log("Stats.data", data);
  }

  window.Stats = {add: add, log: log, here: here};

})();

console.log(Stats);
