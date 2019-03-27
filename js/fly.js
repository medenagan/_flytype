/*
 *  fly.js (v) 1.0.0
 *
 *  Class controlling a suggestions list ui
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

var CSS_PREFIX = "flytype_160417_";
var CSS_TAG_CLASS = CSS_PREFIX + "tag";
var CSS_EDIT_ON = CSS_PREFIX + "edit_on";
var CSS_PRESELECTED = CSS_PREFIX + "preselected";

var DEBUG_ALWAYS_ON = false;

function Fly() {
  var mySelf = this;

  var ul = new SuggestionTag();


  var _lastAnatomy;

  var hasReplaced;

  this.show = ul.show;
  this.shown = ul.shown;
  this.hide = ul.hide;
  this.selectNextSuggestion = ul.selectNextSuggestion;
  this.selectPreviousSuggestion = ul.selectPreviousSuggestion;

  var _target;
  Object.defineProperty(this, "target", {
    get () {
      return _target;
    },

    set(newTarget) {
      if (_target)
        _target.classList.remove(CSS_EDIT_ON);

      _target = newTarget;
      // Avoid late async suggestions from being shown
      _lastAnatomy = null;

      if (_target && !_disabled)
        _target.classList.add(CSS_EDIT_ON);
    }
  });

  var _disabled = false;
  Object.defineProperty(this, "disabled", {
    get () {
      return _disabled;
    },

    set(value) {
      _disabled = !!value;
      mySelf.target = mySelf.target;
    }
  });

  this.toggle = function () {
    this.disabled = !this.disabled;
    return this.disabled;
  }

  this.assumeNewCaret = function () {
    // Prevent any queued async suggestion to be shown
    _lastAnatomy = null;
  };

  var _capslock = false;
  this.setCapslock = function (charCapslock, invertShift) {
    // FIXME
    invertShift = false;

    // "b" != "B"
    if (charCapslock !== charCapslock.toUpperCase()) {
      _capslock = !!invertShift; // false if SHIFT is off
    }

    // "A" != "a"
    else if (charCapslock !== charCapslock.toLowerCase()) {
      _capslock = !invertShift // true if SHIFT is off
    }

    // Ignore cases like "," "?" ...
  };


  var _matcher;
  Object.defineProperty(this, "matcher", {
    get () {
      return _matcher;
    },

    set(newMatcher) {
      if (! (newMatcher instanceof Matcher))
        throw new Error("Fly.Matcher must be a Matcher");

      _matcher = newMatcher;
    }
  });

  this.replace = function (options) {

    if (_disabled) return;

    var anatomy = anatomizeCurrentWord(_target);

    options = options || {};
    options.word = options.word || ul.getSelectedSuggestion();
    if (! options.word) {
      console.error(".replace(): no word to insert, returning");
      return;
    }
    if (options.suffix) options.word += options.suffix;

    // Add a space after if not value after or no ".", " "
//    if ( !selection.afterValue.length || SPACE_LIKE_CHARS.indexOf(selection.afterValue[0]) === -1) options.word += " ";

    // Add a before after if not value after or no ".", " "
    if (anatomy.beforeValue.length && " \n@#".indexOf(anatomy.beforeValue[anatomy.beforeValue.length - 1]) === -1) options.word = " " + options.word;

    anatomy.wordRange.replaceText(options.word);

    return anatomy.word.levenshtein(options.word);
  };

  /*
     trigger(): a user input innescates the suggestion process
  */

  this.trigger = function (options) {

    if (! _matcher || _disabled) return;

    if (! (options instanceof Object)) options = {};

    var anatomy = _lastAnatomy = anatomizeCurrentWord(_target);

    console.log({anatomy})

    // Get an array of words to suggest

    // Synch way: to avoid if possible
    if (options.synch) {
      console.log("Fly.trigger was called SYNCH")
      gotSuggestions(_matcher.getMatches(anatomy.word));
    }

    else {
      // ASYNCH way (through worker)
      meta.chrome.runtime.sendMessage({matcher: {getMatches: anatomy.word}}, gotSuggestions);
    }

    function gotSuggestions(suggestions) {
      // Convert to the proper case ( "This", "That" ... or ... "THIS", "THAT" ...)
		  // All UPPER CASE
		  if (_capslock) {
		    suggestions.words = suggestions.words.map(function (s) {
		      return s.toUpperCase();
		    });
		  }

		  // First letter uppercased after ".", "?", ... or when user typed "... Someth..."
		  else if (anatomy.newSentence || anatomy.word.startsWithUpperCase() ) {
		    suggestions.words = suggestions.words.map(function (s) {
		      return s.toFirstUpperCase();
		    });
		  }

      if (options.show && (anatomy === _lastAnatomy)) {
				ul.setSuggestions(suggestions);
				ul.show();

				// Adjust position
				//ul.move.asynch(this, anatomy.wordRange); // anatomy.leftValue.length);
				ul.move.call(this, anatomy.wordRange);
      }
    }
  };
};




// A list of suggestions to display
function SuggestionTag() {

  var mySelf = this;

  var tag =  document.createElement("DIV");
  var ul = document.createElement("UL");

  tag.classList.add(CSS_TAG_CLASS);
  tag.style.display = "none";
  tag.appendChild(ul);

  var suggestionsList = []; var suggestionsIndex = 0; var suggestionsUserChosen;

  if (DEBUG_ALWAYS_ON) {
    this.show = function () {
    tag.style.display = "block";
    };

    this.hide = function () {
     tag.style.display = "none";
    };

    this.shown = function () {
      return tag.style.display === "block";
    };
  }

  else {

    var _showingRelay = new Relay(_adjustTagVisibility);

    function _adjustTagVisibility() {

      var visibility = (_showingRelay.state && suggestionsList.length);

    console.log("_adjustTagVisibility", _showingRelay.state, suggestionsList.length, "d:");

      if (visibility) {
        tag.style.display = "block";
      }

      else {
        tag.style.display = "none";
        if (tag.parentNode) tag.parentNode.removeChild(tag);
      }
    }

    this.show = function () {
      console.log("Tag.show()");
      if (DEBUG_ALWAYS_ON) {
        _adjustTagVisibility(true);
      }
      else {
        _showingRelay.trigger(TAG_POPUP_WAIT); // FIXME should be called once but trigget don't recall, state is the combined with length
        _adjustTagVisibility();
      }
    }

    this.hide = function () {
      console.log("Tag.hide()");
      _showingRelay.clear();
    }

    this.shown = function () {
      // Shown means on and at least one suggestion, otherwise " " won't work well as replace character / normale space
      return tag.style.display === "block" && suggestionsList.length;
    };
  }

/* OLD
  var autoHide;
  this.showEXXXXXXXXXX = function (ms) {
    // Clear autohide
    if (autoHide) autoHide = window.clearTimeout(autoHide);
    // Show
    tag.style.display = "block";
    // Set autohide
    if (ms)  autoHide = window.setTimeout(function () {
      tag.style.display = "none";
      document.body.removeChild(ul);
    }, ms);
  };

  this.hideEXXXXXXXXXXXX = function (ms) {
    // Clear autohide
    if (autoHide) autoHide = window.clearTimeout(autoHide);
    // Hide
    tag.style.display = "none";
  };

*/


  var selectSuggestion = function (offset, absolute) {
    if (absolute) {
      suggestionsIndex = offset;
    }
    else {
      suggestionsIndex += offset;
    }
    // Mod
    suggestionsIndex %= suggestionsList.length;
    if (suggestionsIndex < 0) suggestionsIndex = suggestionsList.length + suggestionsIndex; // +suggestionsIndex = -ABS(suggestionsIndex)
    // Selected li
    var flytypeIndex = "" + suggestionsIndex;
    // Preselect a suggestion
    ul.querySelectorAll("li").forEach(function (li) {
      if (li.dataset.flytypeIndex === flytypeIndex) {
        li.classList.add(CSS_PRESELECTED);
      }
      else {
        li.classList.remove(CSS_PRESELECTED);
      }
    });
  };

  var liMouseOver = function (event) {
    mySelf.show(TAG_POPUP_WAIT);
    selectSuggestion(parseInt(event.target.dataset.flytypeIndex), true);
    suggestionsUserChosen = true;
  };

  this.setSuggestions = function(suggestions) {

    // Avoid to reset suggestions (and change the preselected one) if the array does not change
    if (suggestionsList.equals(suggestions.words)) {
      // Index may be changed, in this case reselect. Order of index is: USERCHOSEN, SUGGESTED, 0
      if (!suggestionsUserChosen && suggestions.index && suggestions.index !== suggestionsIndex) {
        selectSuggestion(suggestions.index, true);
      }
    }

    // A new list of words to draw
    else {
      suggestionsList = suggestions.words;
      suggestionsIndex = suggestions.index || 0;
      // Not chosen by user
      suggestionsUserChosen = false;
      // Delete
      while (ul.firstChild) {
        ul.removeChild(ul.firstChild);
      }
      suggestionsList.forEach(function (s, j) {
        var li = document.createElement("li");
        li.dataset.flytypeIndex = j;
        // Automatically selects the first
        if (j === suggestionsIndex) li.classList.add(CSS_PRESELECTED);
        ///////////////li.onmouseover = liMouseOver;
        li.appendChild(document.createTextNode(s));
        ul.appendChild(li);
      });
    }
  };

  this.getSelectedSuggestion = function () {
    return suggestionsList[suggestionsIndex];
  };

  this.selectNextSuggestion = function () {
    // Backwards compatibility
    selectSuggestion(+1);
    suggestionsUserChosen = true;
  };

  this.selectPreviousSuggestion = function () {
    // Backwards compatibility
    selectSuggestion(-1);
    suggestionsUserChosen = true;
  };

  this.move = function (range) {

    // Check if the page removed the ul
    if (! tag.parentNode) {
      document.body.appendChild(tag);
    }

    var TAG_FONTSIZE_MIN = 13.50;
    var TAG_FONTSIZE_MAX = 22;

    console.log("INIZIO a move() 1");
  //  var rect2 = range.getBoundingClientRect();

    var rect = range.collapseToLeft().getBoundingClientRect();

    console.log("INIZIO a move() 2");



    var fontSize = Math.min(Math.max(rect.height, TAG_FONTSIZE_MIN), TAG_FONTSIZE_MAX);


    console.log({rect, fontSize});



    tag.style.fontSize = fontSize + "px";
    tag.style.lineHeight = (fontSize * 1.1) + "px";

    tag.style.left =  rect.left + "px";
    tag.style.top = (rect.top - ul.offsetHeight) + "px";


   //  TODO got bottom if there is not space enighiut

   // Tester for position
   if (false) {
      if (! window.cornice) window.cornice = document.createElement("DIV");
      document.body.appendChild(window.cornice);
      window.cornice.style.border = "1px solid red";
      window.cornice.style.left = rect2.x + "px";
      window.cornice.style.top = rect2.y + "px";
      window.cornice.style.width = rect2.width + "px";
      window.cornice.style.height = rect2.height + "px";
      window.cornice.style.position = "fixed";
      window.cornice.style.zIndex = 9999999;
      window.cornice.style.name = "corniciotta";
   }
  };


}

function anatomizeCurrentWord (node) {
  
    var anatomy = {};

    // Selected range
    anatomy._selectionRange = Range.create(node).fitToSelection();

    // By default, collapse to right
    anatomy._collapsedRange = anatomy._selectionRange.collapseToRight();

    anatomy._leftRange = anatomy._collapsedRange.growToLeft();
    anatomy._rightRange = anatomy._collapsedRange.growToRight();


    // "La mia par|ola diventa" -> "La mia par", "ola diventa"
    anatomy.leftValue = anatomy._leftRange.toString();
    anatomy.rightValue = anatomy._rightRange.toString();

    // Get left boundaries: "... par|ola ..." -> "par"
    anatomy._leftWordRange = anatomy._leftRange.search(/[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+$/i);

    // Get right boundaries: "... par|ola ..." -> "ola"
    anatomy._rightWordRange = anatomy._rightRange.search(/^[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+/i);

    anatomy.wordRange = anatomy._leftWordRange.merge(anatomy._rightWordRange);
    anatomy.wordString = anatomy.word = anatomy.wordRange.toString();

    anatomy._leftWord = anatomy._leftWordRange.toString();
    anatomy._rightWord = anatomy._rightWordRange.toString();


    // "La mia par|ola diventa" -> "La mia "
    anatomy._beforeRange = anatomy._leftWordRange.collapseToLeft().growToLeft();

    // "La mia par|ola diventa" -> " diventa "
    anatomy._afterRange = anatomy._rightWordRange.collapseToRight().growToRight();


    anatomy.beforeValue = anatomy._beforeRange.toString();
    anatomy.afterValue =  anatomy._afterRange.toString();

    // Detect any ".", "!", "?" before the current word
    anatomy.newSentence = !anatomy.beforeValue.length || /[!\?\.\n]\s*$/.test(anatomy.beforeValue);

    return anatomy;
  };


function Relay(callback, quietState) {
  quietState = !! quietState;

  var _runningState = quietState;

  var _handle;

  // Change running state and call callback only when needed
  function _setRunningState(bool) {
    if (bool !== _runningState) {
      _runningState = bool;
      if (callback) callback(_runningState);
    }
  }

  // Trigger is non-cumulative: if called 10 times in a row, waiting is ms and not 10ms
  this.trigger = function (ms) {
    ms = ms || 0;
    // Clear timeout
    if (_handle) _handle = window.clearTimeout(_handle);
    // Invert state for a ms period
    _setRunningState(! quietState);
    // Restore initial state after ms
    _handle = window.setTimeout(function () {
      _setRunningState(quietState);
    }, ms);
  };

  // Clear any running trigger
  this.clear = function () {
    if (_handle) _handle = window.clearTimeout(_handle);
    _setRunningState(quietState);
  };

  Object.defineProperty(this, "state", {
    get () {
      return _runningState;
    }
  });
}



function getNonWordChars(array) {
  var patternAZ = /[^a-z'\-]/i
  return array.filter(function (x) {return patternAZ.test(x);});
}




function selectRange (range) {
  // Clears all ranges in selection and apply that range to window selection
  var sel = window.getSelection();
  sel.removeAllRanges();
  if (range) sel.addRange(range);
};

/* PROTOTYPE */


// Based on http://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript
Array.prototype.equals = function (array) {
  // No array?
  if (! array) return false;

  // Save time by comparing length
  if (this.length !== array.length) return false;

  // Check element by element
  for (var i = 0; i < this.length; i++) {
    // Check if we have nested arrays
    if ((this[i] instanceof Array) && (array[i] instanceof Array)) {
      // recurse into the nested arrays
      if ( !this[i].equals(array[i]) ) return false;
    }
    else if (this[i] !== array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
};
