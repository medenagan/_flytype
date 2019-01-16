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


function Fly() {
  var mySelf = this;

  var tag = new CSuggestionsTag();

  var disable = false;

  var hasReplaced;

  this.show = tag.show;
  this.shown = tag.shown;
  this.hide = tag.hide;
  this.selectNextSuggestion = tag.selectNextSuggestion;
  this.selectPreviousSuggestion = tag.selectPreviousSuggestion;

  var _target;
  var _lastAnatomy;

  Object.defineProperty(this, "target", {
    get () {
      return _target;
    },

    set(newTarget) {
      if (_target) _target.classList.remove(CSS_EDIT_ON);
      // If newTarget not passed, keep old target (used when some option changes)
      _target = newTarget || _target;
      // Avoid late async suggestions from being shown
      _lastAnatomy = null;
      console.log("anatomy azzerata");
      if (!disable) _target.classList.add(CSS_EDIT_ON);
    }
  });

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


  this.toggle = function () {
    disable = !disable;
    mySelf.target = mySelf.target;
  }


  this.replace = function (options) {

    ///if (edit.selectionEnd - edit.selectionStart > 1) return; FIXME

    if (disable) return;

    var anatomy = anatomizeCurrentWord(_target);

    options = options || {};
    options.word = options.word || tag.getSelectedSuggestion();
    if (! options.word) {
      console.error(".replace(): no word to insert, returning");
      return;
    }
    if (options.suffix) options.word += options.suffix;

    // Add a space after if not value after or no ".", " "
//    if ( !selection.afterValue.length || SPACE_LIKE_CHARS.indexOf(selection.afterValue[0]) === -1) options.word += " ";

    // Add a before after if not value after or no ".", " "
    if (anatomy.beforeValue.length && " \n@#".indexOf(anatomy.beforeValue[anatomy.beforeValue.length - 1]) === -1) options.word = " " + options.word;

    // Selection must be greater than 0
    if (true || anatomy.selectionStart < anatomy.selectionEnd) {
      anatomy.wordRange.replaceText(options.word);
    }
  };

  /*
     trigger(): a user input innescates the suggestion process
  */

  this.trigger = function (options) {

    if (! _matcher || disable) return;

    if (! (options instanceof Object)) options = {};

    var anatomy = _lastAnatomy = anatomizeCurrentWord(_target);

    // Get an array of words to suggest

    // Synch way: to avoid if possible
    if (options.synch) {
      console.log("Fly.trigger was collaed SYNCH")
      gotSuggestions(_matcher.getMatches(anatomy.word));
    }

    else {
      // ASYNCH way (through worker)
      meta_chrome.runtime.sendMessage({matcher: {getMatches: anatomy.word}}, gotSuggestions);
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

      // displaying has a ms cost, so only do it when showing to user is necessary
    //  console.log("STIAMO SHOWANDO", options.show);

      if (options.show && (anatomy === _lastAnatomy)) {
				tag.setSuggestions(suggestions);
				tag.show();

				// Adjust position
				//tag.moveNew.asynch(this, anatomy.wordRange); // anatomy.leftValue.length);
				tag.moveNew.call(this, anatomy.wordRange);
      }
    }
  };
};




// A list of suggestions to display
function CSuggestionsTag() {

  var mySelf = this;

  var tag = document.createElement("ul");

  var suggestionsList = []; var suggestionsIndex = 0; var suggestionsUserChosen;

  CSS_TAG_CLASSES.forEach(function (c) {
    tag.classList.add(c);
  });

  // Set main css properties
  tag.style.display = "none";

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

    var _showingRelay = new CRelay(_adjustTagVisibility);

    function _adjustTagVisibility() {
      /// FIXME TRUSTPILOT
      //console.log("ADJUST VISIBILITY WAS DISABLED");
      //return;

      var visibility = (_showingRelay.state && suggestionsList.length);

  //    console.log("_adjustTagVisibility", _showingRelay.state, suggestionsList.length, "d:");

      if (visibility) {
        tag.style.display = "block";
      }

      else {
        tag.style.display = "none";
        if (tag.parentNode) tag.parentNode.removeChild(tag);
      }
    }

    this.show = function () {
      //console.log("Tag.show()");
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
      document.body.removeChild(tag);
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
    tag.querySelectorAll("li").forEach(function (li) {
      if (li.dataset.flytypeIndex === flytypeIndex) {
        li.classList.add(CSS_LI_PRESELECTED);
      }
      else {
        li.classList.remove(CSS_LI_PRESELECTED);
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
      while (tag.firstChild) {
        tag.removeChild(tag.firstChild);
      }
      suggestionsList.forEach(function (s, j) {
        var li = document.createElement("li");
        li.classList.add(CSS_LI);
        li.dataset.flytypeIndex = j;
        // Automatically selects the first
        if (j === suggestionsIndex) li.classList.add(CSS_LI_PRESELECTED);
        ///////////////li.onmouseover = liMouseOver;
        li.appendChild(document.createTextNode(s));
        tag.appendChild(li);
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

  this.moveNew = function (range) {
    // Check if the page removed the tag
    if (! tag.parentNode) {
      document.body.appendChild(tag);
    }

    var TAG_FONTSIZE_MIN = 13.50;
    var TAG_FONTSIZE_MAX = 22;

  //  var rect2 = range.getBoundingClientRect();
    var rect = range.collapseToLeft().getBoundingClientRect();
    var fontSize = Math.min(Math.max(rect.height, TAG_FONTSIZE_MIN), TAG_FONTSIZE_MAX);



    tag.style.fontSize = fontSize + "px";
    tag.style.lineHeight = (fontSize * 1.1) + "px";

    tag.style.left =  rect.left + "px";
    tag.style.top = (rect.top - tag.offsetHeight) + "px";


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
/*
      var ch = new CChronos();
      pippo = (new_range(e.target)).fitToSelection().collapseToRight();
      pippo = pippo.growToLeft().search(/[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+$/i).merge(pippo.growToRight().search(/^[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+/i));
      ch.log("word time");

*/



    var res = {};

    // Get position in the middle
    //var pos = Math.floor(0.5 * (edit.selectionStart + edit.selectionEnd));

    /* Mode:
         1. BREAK (default): "des|pite", "|despite" "despite|" -> _despite_   ALLOWSPACE: " for | tress " -> _for  tress _
         2. LEFT: "wikipedia|is" -> _wikipedia_   "some|thing" -> _some_   ALLOWSPACE: " your | heart " -> _your _
         3. RIGHT: "wikipedia|is" -> "is"   "some|thing" -> "thing"   ALLOWSPACE: " your | heart " -> " heart"
    */

    // Selected range
    res._selectionRange = (new_range(node)).fitToSelection();

    // By default, collapse to right
    res._collapsedRange = res._selectionRange.collapseToRight();

    res._leftRange = res._collapsedRange.growToLeft();
    res._rightRange = res._collapsedRange.growToRight();


    // "La mia par|ola diventa" -> "La mia par", "ola diventa"
    res.leftValue = res._leftRange.toString();
    res.rightValue = res._rightRange.toString();

    // Get left boundaries: "... par|ola ..." -> "par"
    res._leftWordRange = res._leftRange.search(/[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+$/i);

    // Get right boundaries: "... par|ola ..." -> "ola"
    res._rightWordRange = res._rightRange.search(/^[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+/i);

    res.wordRange = res._leftWordRange.merge(res._rightWordRange);
    res.wordString = res.word = res.wordRange.toString();

    res._leftWord = res._leftWordRange.toString();
    res._rightWord = res._rightWordRange.toString();


    // "La mia par|ola diventa" -> "La mia "
    res._beforeRange = res._leftWordRange.collapseToLeft().growToLeft();

    // "La mia par|ola diventa" -> " diventa "
    res._afterRange = res._rightWordRange.collapseToRight().growToRight();


    res.beforeValue = res._beforeRange.toString();
    res.afterValue =  res._afterRange.toString();

    // Detect any ".", "!", "?" before the current word
    res.newSentence = !res.beforeValue.length || /[!\?\.\n]\s*$/.test(res.beforeValue);

/*

    var _exec = /[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+$/.exec(res.leftValue);
    if (_exec) {
      res.leftWord = _exec[0];
      res.selectionStart = NaN; //_exec.index;
    }
    else {
      res.leftWord = "";
      res.selectionStart = res.leftValue.length;
    }
    // Get right boundaries: "... par|ola ..." -> "ola"
    _exec = /^[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+/.exec(res.rightValue);
    if (_exec) {
      res.rightWord = _exec[0];
      res.selectionEnd = res.leftValue.length + res.rightWord.length;
    }
    else {
      res.rightWord = "";
      res.selectionEnd = res.leftValue.length;
    }

*/



    // Complete word
//    res.word = res.leftWord + res.rightWord;

    // "La mia par|ola diventa" -> "La mia "
//    res.beforeValue = res.leftValue.substr(0, res.selectionStart);
    // "La mia par|ola diventa" -> " diventa "
 //   res.afterValue = res.rightValue.substr(res.rightWord.length);

    // Detect any ".", "!", "?" before the current word
 //   res.newSentence = !res.beforeValue.length || /[!\?\.\n]\s*$/.test(res.beforeValue);

    //console.log("anatomize current word", res);
    return res;

  };


function CRelay(callback, quietState) {
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


Object.prototype.toFileJSON = function (spaces) {
  var blob = new Blob([JSON.stringify(this, false, spaces)], {type: "text/csv;charset=utf-8;"}); // Does not save without csv, for example application/json not working
  window.open(URL.createObjectURL(blob));
};

String.prototype.toBlobFile = function () {
  var blob = new Blob([this], {type: "text/csv;charset=utf-8;"}); // Does not save without csv, for example application/json not working
  window.open(URL.createObjectURL(blob));
};

Array.prototype.toCSVString = function (tab, newline) {
  tab = tab || "\t";
  newline = newline || "\n";
  var args = []; var list = [];
  for (var k = 0; k < this.length; k++) {
    var element = this[k];
    var properties;
    var typeElement = Array.isArray(element) ? "array" : typeof(element);
    switch (typeElement) {
      case "string":
      case "number":
      case "boolean":
      case "array":
        var value = element;
        properties = ["[" + typeElement + "]"];
        element = {};
        element[properties[0]] = value;
        break;
      default:
        properties = Object.getOwnPropertyNames(element);
    }
    args.uniquePush.apply(args, properties);
    list.push(args.map(function (a) {
      return element.hasOwnProperty(a) ? String(element[a]) : ""; //  JSON.stringify(element[a])
    }).join(tab));
  }
  list.unshift(args.join(tab));
  return list.join(newline);
};

Array.prototype.uniquePush = function () {
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    if (this.indexOf(a) === -1) this.push(a);
  }
};

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

String.prototype.regexIndexOf = function (pattern) {
  var rex = pattern.exec(this);
  return rex ? rex.index : -1;
};

String.prototype.startsWithUpperCase = function () {
  var char = (this).charAt(0);
  // "A" != "a" and "'" == "'", function considers upper case only first case
  return char !== char.toLowerCase();
};

String.prototype.toFirstUpperCase = function () {
  return (this[0] || "").toUpperCase() + this.substr(1);
};


function new_range(whatFrom) {
  // https://stackoverflow.com/questions/25766664/check-if-dom-element-is-editable-allow-user-input-with-pure-js
  if (whatFrom instanceof HTMLInputElement || whatFrom instanceof HTMLTextAreaElement) {
    return new CTextareaRange(whatFrom);
  }
  else {
    return new CRange(whatFrom);
  }
}

(function () {
  // Based on faux div technique https://github.com/component/textarea-caret-position/conblob/master/index.js

  // Create a mirrored div
  var fauxDiv = document.createElement("div");

  // Set position off-screen
  fauxDiv.style.position = "absolute";
  fauxDiv.style.left = "-30px";
  fauxDiv.style.top = "-1px";
  fauxDiv.style.display = "block";
  fauxDiv.style.visibility = "hidden";  // not 'display: none' because we want rendering
  //////fauxDiv.style.visibility = "visible" //"hidden";  // not 'display: none' because we want rendering

  // Add a global the function getCaretCoordinates
  window.getCaretCoordinates = function (element, position) {

    var editStyle = getComputedStyle(element);
    // Transfer the element's properties to the div
    Object.getOwnPropertyNames(editStyle).forEach(function (s) {
      // Filter some properties
      if (["position", "left", "top", "display", "visibility"].indexOf(s) === -1) {
        fauxDiv.style[s] = editStyle[s];
      }
    });

    // Words can be broken if are too long to emulate TEXTAREAs. INPUTs are always single line.
    if (element.nodeName === "TEXTAREA") {
       // Words can be broken if are too long to emulate TEXTAREAs.
      fauxDiv.style.wordWrap = "break-word";
      // Preserve whitespace, break on spaces to simulate TEXTAREAs
      fauxDiv.style.whiteSpace = "pre-wrap"
    }
    else if (element.nodeName === "INPUT") {
      // INPUTs are always single line.
      fauxDiv.style.wordWrap = "normal";
      // Preserve whitespace, never break on spaces as INPUTs don't
      fauxDiv.style.whiteSpace = "pre"
    }

    // overflow must be forced each time after changing style since it gets defaulted, cannot be filters as position, left ...
    // for Chrome: clipped content and do not render a scrollbar; since scrollbars on textareas are outside whereas on divs inside
    fauxDiv.style.overflow = "hidden";

    // Need to add div to body or it won't be rendered
    document.body.appendChild(fauxDiv);


    fauxDiv.textContent = element.value.substring(0, position);
    // the second special handling for input type="text" vs textarea: spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
    //if (element.nodeName === 'INPUT') fauxDiv.textContent = fauxDiv.textContent.replace(/\s/g, '\u00a0');

    // Wrapping must be replicated *exactly*, including when a long word gets
    // onto the next line, with whitespace at the end of the line before (#7).
    // The  *only* reliable way to do that is to copy the *entire* rest of the
    // textarea's content into the <span> created at the caret position.
    // for inputs, just '.' would be enough, but why bother?

    // Created a faux span to extract position
    var fauxSpan = document.createElement("span");
    fauxDiv.appendChild(fauxSpan);

    var coordinates = {};
    // Measure one line of text
    fauxSpan.textContent = "W";
    coordinates.singleLineHeight = fauxSpan.offsetHeight;

    fauxSpan.textContent = element.value.substring(position) || ".";  // || because a completely empty faux span doesn't render at all

    coordinates.top = fauxSpan.offsetTop + parseInt(editStyle.borderTopWidth) - element.scrollTop;
    coordinates.left = fauxSpan.offsetLeft + parseInt(editStyle.borderLeftWidth) - element.scrollLeft;

    coordinates.fauxSpanLeft = fauxSpan.offsetLeft;
    coordinates.fauxSpanText = fauxSpan.textContent;
    coordinates.scrollLeft = element.scrollLeft;

    // Remove div
    document.body.removeChild(fauxDiv);

    return coordinates;
  };

}());
