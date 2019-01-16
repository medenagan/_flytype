/*
 *  flytype.js (v) 0.0.1
 *
 *  Helper to normalize .chrome and .runtime objects accross different browsers
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

 "use strict";

var DEBUG = !false;
var SPECIAL_KEY_TEST = false;
var DEBUG_ALWAYS_ON = false;

var CSS_EDIT_ON = "flytype_160417_edit_on";
// Add more than one class to increase specificity
var CSS_TAG_CLASSES = ["flytype_160417_tag", "flytype_270318_tag"];
var CSS_LI = "flytype_270318_li";
var CSS_LI_PRESELECTED = "flytype_160417_preselected";


var TAG_POPUP_WAIT = 1750;


var SPACE_LIKE_CHARS = ". :;!?,";

var REX_LEFT_WORD_BEGINNING = /[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+$/
var REX_RIGHT_WORD_BREAK = /[^-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]/;

var REX_WORD_BREAK_CHAR = /[^-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]/;

var settings = {};

/*

INSTRUCTIONS:

1. Press ESC to hide suggestions on that word
2. Press SPACE to accept the suggestion
2b. Press "." "," "!" "?" to accept the suggestion
3. Press ARROWS LEFT, TOP to preselect previous suggestion
4. Press ARROWS RIGHT, BOTTOM to preselect following suggestion

*/

var KEY_BACKSPACE = 8;
var KEY_TAB = 9;
var KEY_ALT = 18;
var KEY_ESC = 27;
var KEY_SPACE = 32;
var KEY_LEFT_ARROW = 37;
var KEY_UP_ARROW = 38;
var KEY_RIGHT_ARROW = 39;
var KEY_DOWN_ARROW = 40;
var KEY_DELETE = 46;


var fly = new CFly();


function aLoadDictionary (language, callback) {
  meta_chrome.runtime.sendMessage({loadDictionary: language}, callback);
}


aLoadDictionary("en", function (dictionary) {
  fly.wordMatcher = new WordMatcher(dictionary.words);
});


function isTypeable(element) {
  return element.tagName === "TEXTAREA" ||
    (element.tagName === "INPUT" && element.type === "text") ||
    element.isContentEditable ||
    element.ownerDocument.designMode === "on";
}

function main() {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("keyup", onKeyup);
  document.addEventListener("focusout", onFocusOut);
  document.addEventListener("mousedown", onMouseDown);
  window.addEventListener("beforeunload", onBeforeUnload);

//  if (DEBUG) document.addEventListener("mousemove", onClick);
};

function onBeforeUnload(e) {
  console.log("CIAOCIAO", e);
  return "X";
}

function onMouseDown(e) {
  if (e.target === fly.target) {
    // User might have changed the selection caret
    fly.assumeNewCaret();
  }
}


function onFocusOut(e) {
  // If fly was enabled on the target, n-grammize the content
  if (e.target === fly.target) {
    meta_chrome.runtime.sendMessage({ngram: {excerptText: (e.target.value || e.target.contentText)}});
    fly.target = null;
  }
}





function debug3(div) {

      /*
        selection object
       @@ valueBefore --> "Il " "Il |mio| test d'esempio"
       @@ valuerAfter --> " test d'esempio" "Il |mio| test d'esempio"

       @@ .selectionStartOffset --> 3 "Il |mio| test d'esempio"
       @@ .selectionStartNode --> null for input, contains the node for editable divs

       @@ .selectionEndOffset --> 6 "Il |mio| test d'esempio"
       @@ .selectionEndNode --> null for input, contains the node for editable divs


    beforeValue
    :
    ""
    leftValue
    :
    "ds"
    leftWord
    :
    "ds"
    newSentence
    :
    true
    rightValue
    :
    ""
    rightWord
    :
    ""
    selectionEnd
    :
    2
    selectionStart
    :
    0
    word
    :
    "ds"

      */



          var caretOffset = 0;
        var res = {};
        // Method: Creates 3 main ranges, Selection, Before and After selection


        var selection = window.getSelection();
        if (selection.rangeCount > 0) {
          // Get selected range
          var selectedRange = selection.getRangeAt(0);

          // Build before selected range
          var beforeRange = selectedRange.cloneRange();
          beforeRange.selectNodeContents(div);
          beforeRange.setEnd(selectedRange.startContainer, selectedRange.startOffset);
          // Build after selected range
          var afterRange = selectedRange.cloneRange();
          afterRange.selectNodeContents(div);
          afterRange.setStart(selectedRange.endContainer, selectedRange.endOffset);
          // Return
          res.beforeRange = beforeRange;
          res.selectedRange = selectedRange;

          // Save text of selection as range.toString() does not keep \n
          res.selectedText = selection.toString();

          res.valueBefore = beforeRange.toString();
          res.valueAfter = afterRange.toString();
          res.valueSelected = selectedRange.toString();


          // FINE

          //  ates each node of the div
          var nodeIterator = document.createNodeIterator(div, NodeFilter.SHOW_ALL);

          var beforeList = "";
          var afterList = "";
          var sameLeftList = "";
          var sameRightList = "";
          var nodeList = [];
          var NODE_TEXT = 3;
          //var Node.DOCUMENT_POSITION_PRECEDING = Node.DOCUMENT_POSITION_PRECEDING;
          //var Node.DOCUMENT_POSITION_FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;


          var selNode = selectedRange.startContainer;
          var selOffset = selectedRange.startOffset;

          var currentNode;

          var wordStartNode; var wordStartOffset;
          var wordEndNode; var wordEndOffset;

          var theta;

          var cc = new CChronos();
          var NONBREAK_TAGS = ["SPAN", "FONT", "B", "STRONG", "I", "EM", "MARK", "SMALL", "DEL", "INS", "U"];
          var hardTag = true;
          // Expand wordRange
          while (currentNode = nodeIterator.nextNode()) {
            var comparedPositionStart = selNode.compareDocumentPosition(currentNode);

            // Each time hardTag is true and we're in a textNode, start offeset is zeroed to that textNode
            if (hardTag && currentNode.nodeType === NODE_TEXT) {
              wordStartNode = currentNode;
              wordStartOffset = 0;
              //console.log("BREAKING ON", currentNode.textContent);
              hardTag = false;
            }

            if (comparedPositionStart & Node.DOCUMENT_POSITION_PRECEDING) {
              if (currentNode.nodeType === NODE_TEXT) {
                // Selec//////tion will start at end of this node
                // /////After an hard tag ("BR", "DIV"), restart from the leftiest part the text
                var pos = currentNode.textContent.lastIndexOf(" ");
                if (pos > -1) {
                  wordStartNode = currentNode;
                  wordStartOffset = pos + 1;
                //  console.log("PRECEDING", currentNode.textContent.substr(pos + 1));
                }
                continue;
              }
              else {
                beforeList += "<" + currentNode.tagName + ">";
                // Left boundaries restart each time a break tag is found
                if (NONBREAK_TAGS.indexOf(currentNode.tagName) === -1) {
                  hardTag = true;
                }
                else {
                  // span, font, ... don't make it restart
                 // resetStart = false;
                //  console.log("NON STARTING AGAIN", currentNode.tagName);
                }
                  // Last range right boundaries will apply
                //  wordStartNode = currentNode;
                //  wordStartOffset = currentNode.length;
                continue;
              }
            }
            else if (comparedPositionStart & Node.DOCUMENT_POSITION_FOLLOWING) {
              if (currentNode.nodeType === NODE_TEXT) {
                var pos = currentNode.textContent.regexIndexOf(REX_RIGHT_WORD_BREAK);
                afterList += currentNode.textContent;
                if (pos > -1) {
                  // Break on space
                  wordEndNode = currentNode;
                  wordEndOffset = pos;
                 // console.log("break1");
                  break;
                }
                else {
                  // Extends range and cycle next
                  wordEndNode = currentNode;
     //     console.log("Z" + currentNode.length);
                  wordEndOffset = currentNode.length;
                  continue;
                }
              }
              else {
                afterList += "<" + currentNode.tagName + ">";
                // Ignore span and format tags, but break on others
                if (NONBREAK_TAGS.indexOf(currentNode.tagName) === -1) {
                  // Last range right boundaries will apply
                  break;
                }
              }
            }
            // Same node: comparedPositionStart === 0
            else if (! comparedPositionStart) {
              if (currentNode.nodeType === NODE_TEXT) {
                // "par|ola"
                // Evaluate left part of text: if any non word car is found, set a new start boundaries
                var pos = currentNode.textContent.substr(0, selOffset).lastIndexOf(" ");
                if (pos > -1) {
                  wordStartNode = currentNode;
                  wordStartOffset = pos + 1;
                }
                // Then evaluate right part of the text. If a word break is found, end boundaries are set
                // so it will end the while, otherwise will keep on searching
                pos = currentNode.textContent.substr(selOffset).regexIndexOf(REX_RIGHT_WORD_BREAK);
                if (pos > -1) {
                  wordEndNode = currentNode;
                  wordEndOffset = pos + selOffset;
               //   console.log("break2");
                  break;
                }
                else {
                  // Extends range and cycle next
                  wordEndNode = currentNode;
         //         console.log("W" + currentNode.length);
                  wordEndOffset = currentNode.length;
                  continue;
                }
                sameLeftList += currentNode.textContent.substr(0, selOffset);
                sameRightList += currentNode.textContent.substr(selOffset);
              }
            }
              //switch (currentNode.compareDocumentPosition(selectedRange.startContainer))
           //   nodeList.push({p: comparedPositionStart, p2: (comparedPositionStart & Node.DOCUMENT_POSITION_FOLLOWING), p3: (comparedPositionStart & Node.DOCUMENT_POSITION_PRECEDING), p4: (selectedRange.startContainer.isSameNode(currentNode)), n:currentNode});
          }
//
//          console.log("wordStartNode", wordStartNode);
//          console.log("wordEndNode", wordEndNode);


/*
          var roundedSelectedRange = document.createRange();
          roundedSelectedRange.setStart(wordStartNode, 0);
          roundedSelectedRange.setEnd(wordEndNode, wordEndOffset);
          selectRange(roundedSelectedRange);
*/




          // Assume word range from cursor if necessary
          if (! wordStartNode) {
            wordStartNode = selNode;
            wordStartOffset = selOffset;
          }
          if (! wordEndNode) {
            wordEndNode = wordStartNode;
            wordEndOffset = wordStartOffset;
          }

          var roundedSelectedRange = document.createRange();
          roundedSelectedRange.setStart(wordStartNode, wordStartOffset);
          roundedSelectedRange.setEnd(wordEndNode, wordEndOffset);
          selectRange(roundedSelectedRange);

		return;


        //  var roundedSelectedRange = document.createRange(); //selectedRange.cloneRange();
          //roundedSelectedRange.selectNodeContents(div);
         // roundedSelectedRange.setStart(wordStartNode, wordStartOffset);
         // roundedSelectedRange.setStart(wordStartNode, wordStartOffset);
          //roundedSelectedRange.setEnd(wordEndNode, wordEndOffset);
	//
	  selectRange(roundedSelectedRange);


	console.log("roundedSelectedRange", roundedSelectedRange)

return;

     //     console.log("beforeList", beforeList);
     //     console.log("sameLeftList", sameLeftList);
     //     console.log("sameRightList", sameRightList);
     //     console.log("afterList", afterList);
          //console.log(nodeList);

         // cc.log("selection time:");



          res.roundedSelectedRange = roundedSelectedRange;

          var ELEMENT_NODE = 1;
          var TEXT_NODE = 3;





          // Recursive left navigation
          var getLeftBoundaries = function (node, offset, root, r) {

            r = r || [];

            r.push(node);

            var textContent = node.textContent;

            if (offset > -1) textContent = textContent.substr(0, offset);

            // A word boundary?
            var limit = textContent.regexIndexOf(/[a-zA-z0-9-]*$/); // First word charcter on the right

            if (limit) {
              return {node: node, offset: limit};
            }

            // Search previuos sibling otherwise
            else if (node.previousSibling && (node.previousSibling.nodeType === ELEMENT_NODE || node.previousSibling.nodeType === TEXT_NODE)) {
              return getLeftBoundaries(node.previousSibling, -1, root, r);
            }

            // Search the parent, go on the last sibling of the parent
            else if (node.parentNode && node.parentNode.previousSibling && node.parentNode.previousSibling.lastChild) {

              return getLeftBoundaries(node.parentNode.previousSibling.lastChild, -1, root, r);
            }

            // Boundaries not found
            return {node, offset: 0, err: "boundaries not found"};
          };

 		return;

        }
      //  console.log(res);

        return res;
      };


function debug() {}

/*

Stats:

replacedWords: number of words FlyType has replaced:
 "busi" -> "business" = +1

savedKeys: number of characters FlyType has saved. It's defined as the Levenshtein distance between the initial word typed by the user and the word that FlyType actually replaced
 "busi" -> "business" = +4

typedKeys: number of keys typed in general, even if not replace occurs
  "DNA" = +3



*/

function debug7() {
  console.log("flytype DEBUG on");
  aLoadDictionary("SUBen");
  window.setTimeout(function () {
    console.log("Filtering");

    var mapToObject = function (s, i, a) {
      var max = a.length + 1e-60;
      var min = -1e-60;
      return {s: s.toLowerCase().replace(/[^a-z]/g, ""), o: s}
    };

    var eachReIndex = function (o, i, a) {
      var max = a.length + 1e-60;
      var min = 1e-60;
      o.i = (i - min) / (max - min);
    };

    var SLICE = 0;

    var SUBs = (SLICE ? dictionaries.SUBen.slice(0, SLICE) : dictionaries.SUBen).map(mapToObject);
    var WIKIs = (SLICE ? dictionaries.en.slice(0, SLICE) : dictionaries.en).map(mapToObject);

    SUBs.forEach(eachReIndex);
    WIKIs.forEach(eachReIndex);

    console.log("SUBs: ", SUBs.length);
    console.log("WIKIs", WIKIs.length);


    // UNCOMMO
    var differents = SUBs.filter(function(s) {
      return !WIKIs.some(function (w) {return w.s === s.s});
    });


    console.log(differents.map(d => d.o));

    differents.map(function (m) {return {word: m.o, position: m.i};}).toCSVString().toBlobFile();

/*
    // Common
    var common = WIKIs.map(function(w) {
      var match = SUBs.find(function (s) {return w.s === s.s});
      if (match) {
        return {wiki : w, sub: match, f0: (w.i > match.i ? "S" : "W")}
      }
      else {
        return false;
      }
    });

    // Remove empty
    common = common.filter(f => !!f);

    var approx = function () {
      var r = 0;
      // If common SUB is earlier, replaces it
      common.forEach(function (c) {
        if ((Math.abs(c.sub.i - c.wiki.i) > 1E-5) && (c.sub.i < c.wiki.i) ) { // Math.abs(c.sub.i - c.wiki.i) > 1E-40 // && (c.sub.i < c.wiki.i)
          c.wiki.i = c.sub.i;
          r++;
        }
      });
      console.log("R: ", r);
      // Resort WIKIs
      WIKIs.sort(function (a, b) {return a.i - b.i});
      WIKIs.forEach(eachReIndex);
      return r;
    };

    for (var j = 0; j < 5000; j++) {
      if (!approx()) break;
    }


*/





    var buildDict = {language: "en",
                    version: "0.0.4",
                    source: "wikipedia opensubtitles blended",
                    words: WIKIs.map(w => w.o)
    };

  //  buildDict.toFileJSON(1);

  }, 800);
};




//window.onscroll = fly.reflow; // http://stackoverflow.com/questions/13184779/how-to-capture-all-scrolling-events-on-a-page-without-attaching-an-onscroll-hand
//window.onresize = fly.reflow;

// Used to determing the long press
var _releasedKey_ = true;
// When set on true, the keyUp event will ignore and not show any suggestions
var _preventKeyUp_ = false;

function onKeydown (e) {

  /* Comparison DOWN and key UP:
     DOWN: when user types fast, they don't realease some key: e.x. yoUR with U not released before R is pressed
           this means that UP is not triggered in these cases, DOWN instead captures these sequencies
     UP: JavaScript handles character typing after DOWN and before UP, meaning  on DOWN the character is not
           printed yet. Also, any arrow to move the cursor has not been handled, so script must emulate it all

     Solution: Suggestion is applied at DOWN, but if forces the calculation of suggestion which is normally done on UP so that i.e. " yoUR " is not replace as " yoU "
   */

  // Tabs \t cannot be captured in keyup event!

  // User might have changed the selection caret
  fly.assumeNewCaret();

  // Check the longpress condition
  var longPress = !_releasedKey_;
  _releasedKey_ = false;

  // If _preventKeyUp_ is true, we avoid any handling. Flag must not be falsed because it's for kewUp and not Down
  if (_preventKeyUp_) {
    e.preventDefault();
    return false;
  }

  // CTRL + SPACE  disable or enable flytype on the page
  if (e.ctrlKey && e.keyCode === KEY_SPACE) {
    fly.toggle();
    e.preventDefault();
    return false;
  }

  // Memorize capslock
  if (e.key.length === 1) fly.setCapslock(e.key, e.shiftKey);

  // Decide whether the event is for Fly or not
  var isSameTarget = (fly.target === e.target);

  // It it's a new element, update fly target
  if (! isSameTarget) {
    if (isTypeable(e.target)) {
      fly.target = e.target;
    }
    // Exit event if the targer is not a text element
    else {
      return;
    }
  }

  var isReplacingKey = (SPACE_LIKE_CHARS.indexOf(e.key) > -1) || (e.key === "Enter"); // FIXME

  var shown = fly.shown();

  if (longPress) console.log("LONG /" + e.key + "/"); // FIXME

  // If user has pressed a sequence of keys + " " (or "," ...), since onKeyUp event has not been fired yet, force suggestions before handling
  if (longPress && isReplacingKey) {
    fly.trigger({synch: true, show: true});
    // If at least one suggestion was found, then it can replace
    shown = fly.shown();
    console.log("Suggestions FORCED\n");
  }

  // If fly is not shown, don't replace or do anything, just leave
  if (! shown) return;

  // Any space, comma, when fly is on applies the suggestion
  if (isReplacingKey) {
    // Apply last suggestion
    /////// fly.replace({suffix: e.key.trim()}); FIXME
    fly.replace();
    // Avoid hiding, as it flashes too much when the user types fast
    fly.hide();
    // Prevent key up and default
//    _preventKeyUp_ = true;
//    e.preventDefault();
  }

  // DIRECTIONAL ARROWS
  else if (e.keyCode === KEY_LEFT_ARROW || e.keyCode === KEY_UP_ARROW || e.keyCode === KEY_RIGHT_ARROW || e.keyCode === KEY_DOWN_ARROW) {
    if (longPress) {
      // Replace
      fly.replace();
      // Prevent keyup
      _preventKeyUp_ = true;
      // Hide
      fly.hide();
    }

    else {
      // Previous or next suggestion
      if (e.keyCode === KEY_LEFT_ARROW || e.keyCode === KEY_UP_ARROW) {
        fly.selectPreviousSuggestion();
      }

      else {
        fly.selectNextSuggestion();
      }
      // Show for more time
      fly.show(TAG_POPUP_WAIT);
    }
    e.preventDefault();
  }

  // ALT: hide suggestions
  else if (e.keyCode === KEY_ALT) {
    fly.hide();
    _preventKeyUp_ = true;
    e.preventDefault();
  }
};

function onKeyup(e) {

  // Zero the long press
  _releasedKey_ = true;

  // Ignore if requested on KeyDown (when KeyDown has handled the event and needs avoid bubbling)
  if (_preventKeyUp_) {
    e.preventDefault();
    _preventKeyUp_ = false;
    return false;
  }

  /*
     Conditions for showing suggestions:
     - Same target
     - CTRL is unpressed
     - A printable character was typed
     -   or a cancellation by backspace or DEL occurred
     -   or ALT pressed (triggered by user when wants to see matches)
  */
  if ((fly.target === e.target) &&
    (! e.ctrlKey) &&
    (e.key.length === 1 || e.keyCode === KEY_BACKSPACE || e.keyCode === KEY_ALT || e.keyCode === KEY_DELETE))
  {
    fly.trigger({show: true, synch:true });
  }
};



function CFly() {
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


  var _wordMatcher;
  Object.defineProperty(this, "wordMatcher", {
    get () {
      return _wordMatcher;
    },

    set(newWordMatcher) {
      if (! (newWordMatcher instanceof CWordMatcher)) throw new Error("CFly.wordMatcher must be a CWordMatcher");
      _wordMatcher = newWordMatcher;
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

    if (! _wordMatcher || disable) return;

    if (! (options instanceof Object)) options = {};

    var anatomy = _lastAnatomy = anatomizeCurrentWord(_target);

    // Get an array of words to suggest

    // Synch way: to avoid if possible
    if (options.synch) {
      console.log("Fly.trigger was collaed SYNCH")
      gotSuggestions(_wordMatcher.getMatches(anatomy.word));
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




// Starting
main();
// Debug proc
if (DEBUG) debug();
