


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






















































///////////////////////////////////////////////////////////////////////////////////////////////////////////





/*

  if (DEBUG && SPECIAL_KEY_TEST) {
    var pippo = window.pippo;



    if (! pippo) pippo = new_range(e.target);


/*
  Public methods:


  CRange.fitToSelection() => Return a range of the selected contect IN THE ROOT, or empty if not FIXME COHERENCE



    if ( e.key === "t") {
      pippo = new_range(e.target);
    }

    else if ( e.key === "m") {
      var pippo2 = (new_range(e.target)).fitToSelection();

        /////////  if (pippo2._range) pippo2._root = pippo2._range.commonAncestorContainer;

      pippo = pippo.merge(pippo2);
    }

    else if ( e.key === "x") {
       pippo = pippo.search(new RegExp(prompt("what pattern?", "[\\s\\S]+"), "i"));

    }

    else if ( e.key === "b") {
      var rect = pippo.getBoundingClientRect();

      if (! window.cornice) window.cornice = document.createElement("DIV");
      document.body.appendChild(window.cornice);
      window.cornice.style.border = "1px solid red";
      window.cornice.style.left = rect.x + "px";
      window.cornice.style.top = rect.y + "px";
      window.cornice.style.width = rect.width + "px";
      window.cornice.style.height = rect.height + "px";
      window.cornice.style.position = "fixed";
      window.cornice.style.zIndex = 9999999;
      window.cornice.style.name = "corniciotta";
    }

    // Selection
    else if ( e.key === "s") {
      pippo = pippo.fitToSelection();

    }

    else if ( e.key === "n") {
      pippo = pippo.none();
    }

    else if ( e.key === "l") {
      pippo = pippo.collapseToLeft();
    }

    else if ( e.key === "r") {
      pippo = pippo.collapseToRight();
    }

    else if ( e.key === "L") {
      pippo = pippo.growToLeft();
    }

    else if ( e.key === "R") {
      pippo = pippo.growToRight();
    }

    else if ( e.key === "a") {
      pippo = pippo.growAll();
    }

    else if ( e.key === "w") {
      var ch = new CChronos();
      pippo = (new_range(e.target)).fitToSelection().collapseToRight();
      pippo = pippo.growToLeft().search(/[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+$/i).merge(pippo.growToRight().search(/^[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+/i));
      ch.log("word time");
    }

    else if ( e.key === "q") {
      pippo = pippo.merge(pippo.none());
    }

    else if ( e.key === "d") {
      var ch = new CChronos();
     debug3(e.target);
      ch.log("word time debug3");
      pippo = null;
	return;
    }


    else {
      pippo = null;
    }



   ///// if (pippo._range) pippo._root = pippo._range.commonAncestorContainer;


    if (pippo) {
      window.pippo = pippo;
     // console.log(new Date(), pippo, "length: " + pippo.length);
      pippo.highlight();
      e.preventDefault();
    }
  }
*/




  this.move = function (elem, selectionStart) {
    // Check if the page removed the tag
    if (! tag.parentNode) {
      document.body.appendChild(tag);
    }

    if (elem) {
     var rect = elem.getBoundingClientRect();
      var pos =  getCaretCoordinates(elem, selectionStart || 0);
      //console.log(pos);
/*
bottom
:
537
height
:
300
left
:
264
right
:
984
top
:
237
width
:
720
*/
      tag.style.left =  Math.round(rect.left + pos.left) + "px";
      tag.style.top = Math.round(rect.top - tag.offsetHeight + pos.top) + "px";
    }
  };









function CFlyEx() {
  var mySelf = this;


  var tag = new CSuggestionsTag();

  var disable = false;

  var edit;

  var hasReplaced;

  this.show = tag.show;
  this.shown = tag.shown;
  this.hide = tag.hide;
  this.selectNextSuggestion = tag.selectNextSuggestion;
  this.selectPreviousSuggestion = tag.selectPreviousSuggestion;

/*
  this.reflow = function () {
    if (mySelf.shown && edit) tag.move(edit);
  };
*/

  this.in = function(target) {
    // If target not sent, force rein with old target (used when some option changes)
    if (target !== edit || !target) {
      target = target || edit;
      // Memorize new target and update the border
      if (edit) edit.classList.remove(CSS_EDIT_ON);
      edit = getWrappedEditable(target); // FIXME
      if (!disable) edit.classList.add(CSS_EDIT_ON);
    }
  };

  this.toggle = function () {
    disable = !disable;
    mySelf.in();
  }

  var CANCEL_ME_getCurrentWord = function () {
    var res = {};

    // Get position in the middle
    var pos = Math.floor(0.5 * (edit.selectionStart + edit.selectionEnd));

    /* Mode:
         1. BREAK (default): "des|pite", "|despite" "despite|" -> _despite_   ALLOWSPACE: " for | tress " -> _for  tress _
         2. LEFT: "wikipedia|is" -> _wikipedia_   "some|thing" -> _some_   ALLOWSPACE: " your | heart " -> _your _
         3. RIGHT: "wikipedia|is" -> "is"   "some|thing" -> "thing"   ALLOWSPACE: " your | heart " -> " heart"
    */


    // "La mia par|ola diventa" -> "La mia par", "ola diventa"
    res.leftValue = edit.value.substr(0, pos);
    res.rightValue = edit.value.substr(pos);
    // Get left boundaries: "... par|ola ..." -> "par"
    var _exec = /[-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]+$/.exec(res.leftValue);
    if (_exec) {
      res.leftWord = _exec[0];
      res.selectionStart = _exec.index;
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

    // Complete word
    res.word = res.leftWord + res.rightWord;

    // "La mia par|ola diventa" -> "La mia "
    res.beforeValue = res.leftValue.substr(0, res.selectionStart);
    // "La mia par|ola diventa" -> " diventa "
    res.afterValue = res.rightValue.substr(res.rightWord.length);

    // Detect any ".", "!", "?" before the current word
    res.newSentence = !res.beforeValue.length || /[!\?\.\n]\s*$/.test(res.beforeValue);

    return res;

  };

  this.replace = function (options) {

    ///if (edit.selectionEnd - edit.selectionStart > 1) return; FIXME

    if (disable) return;

    var anatomy;
    var selection = anatomy = anatomizeCurrentWord(edit); /////@@@@@@@@ getCurrentWord(edit);

    // console.log("replace.selection", selection);

    options = options || {};
    options.word = options.word || tag.getSelectedSuggestion();
    if (! options.word) {
      console.log(".replace(): no word to insert, returning");
      return;
    }
    if (options.suffix) options.word += options.suffix;

    // Add a space after if not value after or no ".", " "
    if ( !selection.afterValue.length || SPACE_LIKE_CHARS.indexOf(selection.afterValue[0]) === -1) options.word += " ";

    // Add a before after if not value after or no ".", " "
    if (selection.beforeValue.length && " \n@#".indexOf(selection.beforeValue[selection.beforeValue.length - 1]) === -1) options.word = " " + options.word;

    // Selection must be greater than 0
    if (true || selection.selectionStart < selection.selectionEnd) {
      anatomy.wordRange.highlight();
      document.execCommand("insertText", false, options.word);
    }
  };

  // Insert text on the current position
  this.insert = function(text) {
    document.execCommand("insertText", false, text);
  };


  this.gotKey = function () {

    if (disable) return;
    // Get edit
//    var $edit = $(edit);
    var anatomy;
    var selection = anatomy = anatomizeCurrentWord(edit); //////////@@@@@@@@@@getCurrentWord(edit);

    // Get an array of words to suggest
    var suggestions = checkWord(selection.word.toLowerCase());

    // Detect case
    if (mySelf.capslock) {
      suggestions.words = suggestions.words.map(function (s) {return s.toUpperCase();});
    }
    else if (selection.newSentence || selection.word.startsWithUpperCase() ) {
      // First letter uppercased after ".", "?", ... or when user typed "... Someth..."
      suggestions.words = suggestions.words.map(function (s) {
        return s.toFirstUpperCase();
      });
    }
    tag.setSuggestions(suggestions);
    if (DEBUG) tag.show();
    else tag.show(TAG_POPUP_WAIT);

    // Adjust position
    tag.move(edit, anatomy.beforeValue.length); // anatomy.leftValue.length);

  };



};


function getWrappedEditable(element) {
//return element;
  // This wrapper provids support on editable divs for some properties and method of inputs and textares

  if (element.isWrappedEditable) {
    return element;
  }

  else if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    element.isWrappedEditable = true;
    return element;
  }

  else {
    var div;
    div = element;

    if (! div.hasOwnProperty("value")) {
      Object.defineProperty(div, "value", {
        get: function() {
          return div.textContent;
        },
        set: function(newValue) { "bValue = newValue;" },
        enumerable: true,
        configurable: true
      });
    }
/*
    div.getSelection = function () {};


    Object.defineProperty(div, "selectionStart", {
      get: function() {
        return div.getSelection().beforeRange.toString().length;
      }
    });

    Object.defineProperty(div, "selectionEnd", {
      get: function() {
        var sel = div.getSelection();
        return sel.beforeRange.toString().length + sel.selectedRange.toString().length;
      }
    });

*/
    // Select all inside of a div
    div.selectAll = function () {
      var range = document.createRange();
      range.selectNodeContents(div);
      // Clears all ranges in selection and apply a full selection of the div
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    };


    return element;
  }
}








function checkWord(word) {

  var res = {words: []};

  if (! word.length) return res;

  var getPattern = function (x, middle) {
    const patternCVC = /^([aeiou])([bcdfghjklmnpqrstvwxyz])[aeiou]/;
    const patternCC = /^([bcdfghjklmnpqrstvwxyz])([bcdfghjklmnpqrstvwxyz])/;
    const patternCCplus = /^([bcdfghjklmnpqrstvwxyz]{2,})/;
    const patternCdollar = /[bcdfghjklmnpqrstvwxyz]$/;
    //
    const patternShun = /^([aeiou])(?:tion|sion|cion|shun)/;


    x = x.toLowerCase();
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
    //console.log(pattern);
    return new RegExp(pattern, "i");
  };

  var pattern = getPattern(word);

  // TEST
  var ch = new CChronos();
 // var leven = (dictionaries["en"] || []).filter( f => word.levenstein(f) < 2);

// console.log("leven", leven);
 // ch.log();

 // var maiuscole = dictionaries.en.length;



  //

  var fx = function (x) {return pattern.test(x);}


  // Filter is faster than a for
  var filtered = (dictionaries["en"] || []).filter(fx);
  // If no result, tries to check in the middel
  if (! filtered.length) {
  //  pattern = getPattern(word, true);
   // filtered = (dictionaries["en"] || []).filter(fx);
  }
  // Slice up to MAX_SUGGESTIONS
  var arr1 = filtered.slice(0, MAX_SUGGESTIONS);
  res.words = arr1;

  var loweredWord = word.toLowerCase();
  // If the exact typed word is inside of this list, assume it as index

  var index = arr1.findIndex(function (a) {return a.toLowerCase() === loweredWord});
  if (index > -1) res.index = index;
//  ch.log();


  return res;
}
