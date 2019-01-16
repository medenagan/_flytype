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

/*

INSTRUCTIONS:

1. Press ESC to hide suggestions on that word
2. Press SPACE to accept the suggestion
2b. Press "." "," "!" "?" to accept the suggestion
3. Press ARROWS LEFT, TOP to preselect previous suggestion
4. Press ARROWS RIGHT, BOTTOM to preselect following suggestion

*/


var fly = new Fly();

function aLoadDictionary (language, callback) {
  meta_chrome.runtime.sendMessage({loadDictionary: language}, callback);
}

aLoadDictionary("en", function (dictionary) {
  fly.matcher = new Matcher(dictionary.words);
});


function isTypeable(element) {
  return element.tagName === "TEXTAREA" ||
    (element.tagName === "INPUT" && element.type === "text") || // a.getAttribute("type") === "text"
    element.isContentEditable ||
    element.ownerDocument.designMode === "on";
}

// n-grammize text if the option is active
function flushText(text) {
  if (typeof text !== "string")
    return;

  meta_chrome.runtime.sendMessage({
    ngram: {excerptText: text}
  });

  console.log("EXCEPRTO TESTO")
}


function flushElement(element) {
  // If fly was enabled on the target, n-grammize the content
  if (fly.target === element) {
    flushText(element.value || element.contentText);
  }
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
  flushElement(e.target);
  fly.target = null;
}


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
  if (e.key.length === 1)
    fly.setCapslock(e.key, e.shiftKey);

  // Decide whether the event is for Fly or not
  var isSameTarget = (fly.target === e.target);

  // Exit event if the targer is not a text element

  if (! isSameTarget && ! isTypeable(e.target))
    return;

  // Found a new element, update fly target
  fly.target = e.target;


  var isReplacingKey = (SPACE_LIKE_CHARS.indexOf(e.key) > -1) || (e.key === "Enter"); // FIXME

  if (longPress) console.log("LONG /" + e.key + "/"); // FIXME

  // If user has pressed a sequence of keys + " " (or "," ...), since onKeyUp event has not been fired yet, force suggestions before handling
  if (longPress && isReplacingKey) {
    fly.trigger({synch: true, show: !true});
    // If at least one suggestion was found, then it can replace
    console.log("Suggestions FORCED\n");
  }

  // If fly is not shown, don't replace or do anything, just leave
  var shown = fly.shown();
  console.log({shown});

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
  else if (
    e.keyCode === KEY_LEFT_ARROW ||
    e.keyCode === KEY_UP_ARROW ||
    e.keyCode === KEY_RIGHT_ARROW ||
    e.keyCode === KEY_DOWN_ARROW) {

    if (longPress) {
      fly.replace();
      _preventKeyUp_ = true;
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

  if (fly.target === e.target &&
    (!e.ctrlKey) &&
    (e.key.length === 1 || e.keyCode === KEY_BACKSPACE || e.keyCode === KEY_ALT || e.keyCode === KEY_DELETE))
  {
    fly.trigger({show: true, synch:true });
  }
};





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








// Starting
main();
// Debug proc
if (DEBUG) debug();
