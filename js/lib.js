/*
 *  lib.js (v) 0.0.1
 *
 *  Library common functions
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

"use strict";

// It looks like we're copying underscorejs.js by Jeremy Ashkenas, but I swear, we don't. Totally, I mean. Seriously.

// https://github.com/jashkenas/underscore/blob/master/underscore.js

function CChronos () {
  var start;

  this.restart = function () {
    start = Date.now();
  };

  this.log = function (prefix) {
    console.log((prefix || "") + " " + (Date.now() - start));
  };

  // Disable console in non-debug mode
  //console.error = function () {};

  // Autostart
  this.restart();
};


// Prototype

// ["lucia", "marco", "lucia"] => ["lucia", "marco"] BYNARY COMPARISON!
Array.prototype.unique = function () {
  var filtered = [];

  for (var i = 0, tot = this.length; i < tot; i++) {
    // Compare if the element already exist
    var x = this[i];
    if (filtered.indexOf(x) === -1) filtered.push(x);
  }
  return filtered;
};

// ["abc", "bcd", "cde"] => ["a", "b", "c", "d", "e"]
Array.prototype.toCharset = function () {
  return this.join("").split("").unique();
};


// Java’s String.hashCode()
function sHash32(str) {
  var hash = 0;

  for (var i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash;
    hash += str.charCodeAt(i);
    hash &= hash;
  }

  return hash;
}


// Marco de Wit's Levenshtein https://stackoverflow.com/questions/18516942/fastest-general-purpose-levenshtein-javascript-implementation
String.prototype.levenshtein = (function () {
  // Caches array
  var row = [];

  return function (s_2) { //  return function (s_1, s_2) {

	  /*

		     k i t t e n
		   0 1 2 3 4 5 6
	   s 1 1 2 3 4 5 6
	   i 2 2 1 2 3 4 5
	   t 3 3 2 1 2 3 4
	   t 4 4 3 2 1 2 3
	   i 5 5 4 3 2 2 3
	   n 6 6 5 4 3 3 2
	   g 7 7 6 5 4 4 3

       Marco de Wit's algorithm uses a single array instead of two. Previous and current rows coesist while they get computed,
       three variables keep track of left, above and left-above value.
       Although one of the best Levenshtein algorithm I found, it still tends to be slow for FlyType,
       which must use it on key events over ...K+ words.
       Optimization is preferred over readibility in order to save any milliseconds.

       BEFORE:
       matrix[i_1 - 1][i_2 - 1] = m_1_1
       matrix[i_1 - 1][i_2] = m_1_0
       matrix[i_1][i_2 - 1] = m_0_1

       CALCULATE:
       matrix[i_1][i_2] = L(i_1, i_2)

       AFTER:
       m_0_1 = row
       m_1_1 = m_0_1
       m_1_0 = L(i_1, i_2)

    */

    // const s_1 = this;

    var len_1 = (this).length,
        len_2 = s_2.length;

    if (len_1 === 0) {
      return len_2;
    }

    else if (len_2 === 0) {
      return len_1;
    }

    var i_1 = 0, i_2 = 0,
        m_1_1, m_0_1, m_1_0,
        char_1, d;


    // row-0: [1, 2, 3, ...]
    while (i_2 < len_2) {
      row[i_2] = ++i_2;
    }

    while (i_1 < len_1) {
      char_1 = (this).charCodeAt(i_1);

		  m_1_1 = i_1;
      m_1_0 = ++i_1;

		  for (i_2 = 0; i_2 < len_2; i_2++) {
        /*
           matrix[i_1, i_2 - 1] = m_0_1 === row[i_2];

           a = matrix[i_1 - 1, i_2] + 1 = m_1_0 + 1
           b = matrix[i_1, i_2 - 1] + 1 = m_0_1 + 1
           c = matrix[i_1 - 1, i_2 - 1] + (cost = c_1 !== c_2 ? 1 : 0) = m_1_1 + cost  REPLACEMENT

           L(i_1, i_2) = min(a, b, c) = min(m_1_0 + 1,  m_1_0 + 1, m_1_1 + cost) = 1 + min(m_1_0, m_1_0, m_1_1 + cost - 1)

           min = (a < b) ? a : b;
           min = (a < c) ? a : c;

           matrix[i_1 - 1, i_2 - 1] = m_1_1 = row[i_2];
           matrix[i_1 - 1, i_2] = m_1_0 = min;
           matrix[i_1, i_2 - 1] = row[i_2] = min;
        */

        m_0_1 = row[i_2];


        if (char_1 === s_2.charCodeAt(i_2)) {
          d = m_1_1;
        }

        else {
          d = (m_1_0 < m_1_1) ? m_1_0 : m_1_1;
          d = (d < m_0_1) ? d : m_0_1;
          d++;
        }

        m_1_0 = row[i_2] = d;
        m_1_1 = m_0_1;
		  }
    }
    return m_1_0;
  };
})();


/*
   handler1 = cmch.callback(function1);
   handler2 = cmch.callback(function2);
   handler3 = cmch.callback(function3);
   cmch.once(completeFunction);
*/
function CMultiCallbackHelper () {

  var calls = [];

  this.calls = calls;

  var onComplete;

  this.callback = function (bypassedCallback) {
    if (! (arguments.length === 1 && bypassedCallback instanceof Function)) throw new Error("CMultiCallbackHelper.callback() must take one Function as argument");

    var index = calls.push(0) - 1;

    return function () {
      var res = bypassedCallback.apply(this, arguments);
      calls[index]++
      onBeingCalled();
      return res;
    };
  };

  this.once = function (action) {
    if (! (arguments.length === 1 && action instanceof Function)) throw new Error("CMultiCallbackHelper.once() must take one Function as argument");
    onComplete = action;
    onBeingCalled();
  };

  function onBeingCalled() {
    // [0, 3, 5, ...] > 0: all callbacks should be called at least once
    if ( onComplete && (calls.length > 0) && calls.every(function (c) {return c}) ) {
      onComplete();
    }
  };
};


const WaiterHelper = {
  // WARNING: old style function with large compatibility. To be used only for short timeouts
  waitFor: (function (condition, timeout) {
    const WARNING_TIMEOUT = 250;

    if (! (condition instanceof Function)) throw new Error("CWaiterHelper.waitFor(): 'condition' expected to be a Function.");
    if ((! Number.isFinite(timeout)) || (timeout < 0)) throw new Error("CWaiterHelper.waitFor(): timeout must be a non-negative number");
    if (timeout > WARNING_TIMEOUT) console.warn("CWaiterHelper.waitFor(): detected long timeout " + timeout + " ms");

    const BEGIN = Date.now();

    // Try at least once the condition
    if ( condition() ) return true;

    var delta;
    while (delta = Date.now() - BEGIN, (delta < timeout) && (delta >= 0)) {
      if ( condition() ) return true;
    }

    // true: condition met; false: timeout
    return false;
  })
};



Function.prototype.asynch = function(that) {
  var params = Array.prototype.slice.call(arguments, 1);
  var fx = this;
  return !! setTimeout(function () {fx.apply(that, params);}, 0); // Should always retun true
}


Function.prototype.timeout = function(ms, that) {
  if ((! Number.isFinite(ms)) || (ms < 0)) throw new Error("Function.prototype.timeout(): ms must be a non-negative number");
  var params = Array.prototype.slice.call(arguments, 2);
  var fx = this;
  return !! setTimeout(function () {fx.apply(that, params);}, ms); // Should always retun true
}


// Used for debuggin
Function.prototype.testTimes = function(n) {
  for (var i = 0; i < (n - 1); i++) {
    (this).call();
  }

  if (i < n) return (this).call();
}











///

String.prototype.startsWithUpperCase = function () {
  var char = this.charAt(0);
  return char !== char.toLowerCase();
};

String.prototype.toFirstUpperCase = function () {
  return this.charAt(0).toUpperCase() + this.substr(1);
};


console.log("".toFirstUpperCase());
