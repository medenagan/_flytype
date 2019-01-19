// ********************************** Range START **********************************

/*
  Public methods:

  [constructor] Range(root) => Return a Range which can work on all content inside of root. Root can't be changed

  Range.toString() => Return the text in the range
  [get] Range.length => Give the length of the TEXT in the range

  Range.highlight() => Make a selection of the ranged text on the root
  Range.getBoundingClientRect() => Return a DOMRect of the bouding box enclosing the range

  Range.growAll() => Give a range including all root content
  Range.growToLeft() => Return a range grown up to reach the first left content in root
  Range.growToRight() => Return a range grown up to reach the last right content in root

  Range.collapseToLeft() => Return a collapsed range (start = end) on the left side
  Range.collapseToRight() => Return a collapsed range (start = end) on the right side

  Range.none() => Give a null range (not a collapsed one)
  Range.fitToSelection() => Return a range of the selected contect IN THE ROOT, or none if not FIXME COHERENCE

  Range.search(selectionPattern, [prePattern], [afterPattern]) => Give a subrange of the first match findable from the regular expression

    Range.merge(range) => Return a unified range, both roots must be the same node  FIMEX
  Range.replaceText(text) => Change the text of the range

*/

function Range(root, _range) {
  if (! root) throw new Error("Range.root must be set.");

  this._root = root;
  this._range = _range;
};

Range.create = function (source) {
  if (source instanceof HTMLInputElement || source instanceof HTMLTextAreaElement) {
    return new TextareaRange(source);
  }

  else if (source instanceof HTMLElement){
    return new Range(source);
  }

  else {
    throw new Error("Range.create(source) can't identify this source");
  }
};

// toString() is natively provided
Range.prototype.toString = function () {
  return (this._range) ? this._range.toString() : "";
};

// Select the range
Range.prototype.highlight = function () {
  var selection = window.getSelection();
  selection.removeAllRanges();
  if (this._range) selection.addRange(this._range);
};

// ReplaceText
Range.prototype.replaceText = function (text) {
  if (this._range) {
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(this._range);
    return document.execCommand("insertText", false, text);
  }
  return false;
};

// Range all root up
Range.prototype.growAll = function () {
  var rangeAll = document.createRange();
  rangeAll.selectNodeContents(this._root); // .selectNode(this._root);
  return new Range(this._root, rangeAll);
};

// Null range
Range.prototype.none = function () {
  return new Range(this._root, null);
};

Range.prototype.fitToSelection = function () {
  var selection = window.getSelection();
  // By default not range is found
  var selectionRange = null;

  if (selection.rangeCount) {
    var windowRange = selection.getRangeAt(0);

    var rootRange = document.createRange();
    rootRange.selectNode(this._root);

    /* Selection of root and window can be:

        wS--------wE      rS------rE => [(wS - rS) = -1]  [(wE - rE) = -1] [(wS - rE) = -1]  [(wE - rS) = -1] // all -1, root after selection
        rS------rE      wS--------wE => [(wS - rS) = +1]  [(wE - rE) = +1] [(wS - rE) = +1]  [(wE - rS) = +1] // all +1, root before selection

            rS----wS---wE----rE      => [(wS - rS) = +1]  [(wE - rE) = -1] [(wS - rE) = -1]  [(wE - rS) = +1] // selection inside of root (like body)
         wS----rS---rE-----wE        => [(wS - rS) = -1]  [(wE - rE) = +1] [(wS - rE) = -1]  [(wE - rS) = +1] // selection encoloses the root

        wS----rS----wE--rE      => [(wS - rS) = -1]  [(wE - rE) = -1] [(wS - rE) = -1]  [(wE - rS) = +1] // selection starts before root, ends in root
             rS---wS---rE---wE  => [(wS - rS) = +1]  [(wE - rE) = +1] [(wS - rE) = -1]  [(wE - rS) = +1] // selection starts in root, ends after root
  */

    // Compare Start and End points
    var wSrS = windowRange.compareBoundaryPoints(Range.START_TO_START, rootRange);
    var wErE = windowRange.compareBoundaryPoints(Range.END_TO_END, rootRange);
    //
    var wSrE = windowRange.compareBoundaryPoints(Range.END_TO_START, rootRange);
    var wErS = windowRange.compareBoundaryPoints(Range.START_TO_END, rootRange);

    /*
      // 1 Root after selection
      if ((wSrS === -1) && (wErE === -1) && (wSrE === -1) && (wErS === -1)) {
       // console.log("Root after selection");
      }

      // 2 Root before selection
      else if ((wSrS >= 0) && (wErE >= 0) && (wSrE >= 0) && (wErS >= 0)) {
       // console.log("Root before selection");
      }
    */

    // selection inside of root (like body)
    if ((wSrS >= 0) && (wErE === -1) && (wSrE === -1) && (wErS >= 0)) {
      selectionRange = windowRange;
    }

    // 4 Root is enclosed by a bigger selection
    else if ((wSrS === -1) && (wErE >= 0) && (wSrE === -1) && (wErS >= 0)) {
      selectionRange = rootRange;
    }

    // 5 selection starts before root, then ends in root
    else if ((wSrS === -1) && (wErE === -1) && (wSrE === -1) && (wErS >= 0)) {
      selectionRange = windowRange;
      selectionRange.setStart(rootRange.startContainer, rootRange.startOffset);
    }

    // 6 Selection starts in root, but ends after root
    else if ((wSrS >= 0) && (wErE >= 0) && (wSrE === -1) && (wErS >= 0)) {
      selectionRange = windowRange;
      selectionRange.setEnd(rootRange.endContainer, rootRange.endOffset);
    }
  }

  return new Range(this._root, selectionRange);
};

Range.prototype.merge = function (range) {

  if (! (range instanceof Range)) throw new Error("Argument of Range.merge must be a Range");

  var commonAncestor;

  if (this._root.contains(range._root)) {
    commonAncestor = this._root;
  }

  else if (range._root.contains(this._root)) {
    commonAncestor = range._root;
  }

  else {
    throw new Error("Range.merge cannot be used with non-nested root ranges");
  }

  var a = this._range;
  var b = range._range;

  // Both empty ranges
  if (! (a || b)) {
    return new Range(commonAncestor, null);
  }

  // range empty, this ranged
  else if (! b) {
    return new Range(commonAncestor, a.cloneRange());
  }

  // this empty, range ranged,
  else if (! a) {
    return new Range(commonAncestor, b.cloneRange());
  }

  // Both a and b are non-null ranges

  /* Selection of root and window can be:

        aS--------aE      bS------bE => [(aS - bS) = -1]  [(aE - bE) = -1] [(aS - bE) = -1]  [(aE - bS) = -1] // all -1, root after selection
        bS------bE      aS--------aE => [(aS - bS) = +1]  [(aE - bE) = +1] [(aS - bE) = +1]  [(aE - bS) = +1] // all +1, root before selection

            bS----aS---aE----bE      => [(aS - bS) = +1]  [(aE - bE) = -1] [(aS - bE) = -1]  [(aE - bS) = +1] // selection inside of root (like body)
         aS----bS---bE-----aE        => [(aS - bS) = -1]  [(aE - bE) = +1] [(aS - bE) = -1]  [(aE - bS) = +1] // selection encoloses the root

        aS----bS----aE--bE      => [(aS - bS) = -1]  [(aE - bE) = -1] [(aS - bE) = -1]  [(aE - bS) = +1] // selection starts before root, ends in root
             bS---aS---bE---aE  => [(aS - bS) = +1]  [(aE - bE) = +1] [(aS - bE) = -1]  [(aE - bS) = +1] // selection starts in root, ends after root
  */

  // Compare Start and End points
  var aSbS = a.compareBoundaryPoints(Range.START_TO_START, b);
  var aEbE = a.compareBoundaryPoints(Range.END_TO_END, b);
  //
  var aSbE = a.compareBoundaryPoints(Range.END_TO_START, b);
  var aEbS = a.compareBoundaryPoints(Range.START_TO_END, b);

  var mergedRange = null;

  // 1. aS--------aE      bS------bE
  if ((aSbS === -1) && (aEbE === -1) && (aSbE === -1) && (aEbS === -1)) {
    mergedRange = a.cloneRange();
    mergedRange.setEnd(b.endContainer, b.endOffset);
  }

  // 2. bS------bE      aS--------aE
  else if ((aSbS >= 0) && (aEbE >= 0) && (aSbE >= 0) && (aEbS >= 0)) {
    mergedRange = b.cloneRange();
    mergedRange.setEnd(a.endContainer, a.endOffset);
  }

  // 3. bS----aS---aE----bE
  else if ((aSbS >= 0) && (aEbE === -1) && (aSbE === -1) && (aEbS >= 0)) {
    mergedRange = b.cloneRange();
  }

  // 4. aS----bS---bE-----aE
  else if ((aSbS === -1) && (aEbE >= 0) && (aSbE === -1) && (aEbS >= 0)) {
    mergedRange = a.cloneRange();
  }

  // 5. aS----bS----aE--bE
  else if ((aSbS === -1) && (aEbE === -1) && (aSbE === -1) && (aEbS >= 0)) {
    mergedRange = a.cloneRange();
    mergedRange.setEnd(b.endContainer, b.endOffset);
  }

  // 6. bS---aS---bE---aE
  else if ((aSbS >= 0) && (aEbE >= 0) && (aSbE === -1) && (aEbS >= 0)) {
    mergedRange = b.cloneRange();
    mergedRange.setEnd(a.endContainer, a.endOffset);
  }

  return new Range(commonAncestor, mergedRange);

};

Range.prototype.growToLeft = function () {
  var cursorLeftRange = null;

  if (this._range) {
    // Expand to left
    cursorLeftRange = document.createRange();
    cursorLeftRange.selectNodeContents(this._root);
    cursorLeftRange.setEnd(this._range.endContainer, this._range.endOffset);
  }

   return new Range(this._root, cursorLeftRange);
};

Range.prototype.growToRight = function () {
  var cursorRightRange = null;

  if (this._range) {
    // Expand to right
    cursorRightRange = document.createRange();
    cursorRightRange.selectNodeContents(this._root);
    cursorRightRange.setStart(this._range.startContainer, this._range.startOffset);
  }

   return new Range(this._root, cursorRightRange);
};

Range.prototype.collapseToLeft = function () {
  var collapsedLeftRange = null;

  if (this._range) {
    // Collapse to left
    collapsedLeftRange = this._range.cloneRange();
    collapsedLeftRange.collapse(true);
  }

  return new Range(this._root, collapsedLeftRange);
};

Range.prototype.collapseToRight = function () {
  var collapsedRightRange = null;

  if (this._range) {
    // Collapse to right
    collapsedRightRange = this._range.cloneRange();
    collapsedRightRange.collapse(false);
  }

  return new Range(this._root, collapsedRightRange);
};

// Subrange text
Range.prototype.search = function (selPattern, prePattern, afterPattern) {

  var pattern = selPattern;

  if (this._range) {

    var enchainedText = this._getEnchainedText();

    if (enchainedText.chain.length) {
      // Force pattern into a RegExp as this is standard behavior in js methods
      if (! (pattern instanceof RegExp)) pattern = new RegExp(pattern);

      var matched = pattern.exec(enchainedText.text);
      if (matched) {
        return enchainedText.offsetTextToNode(matched.index, matched.index + matched[0].length);
      }
    }
  }

  return new Range(this._root, null);
};

// Screen absolute
Range.prototype.getBoundingClientRect = function () {

  if (this._range) {
    return this._range.getBoundingClientRect();
  }
  else {
    return new DOMRect(-1, -1, -1, -1);
  }
};

// Private method to create a biunivocal correspondence beetween ranged text a text nodes
Range.prototype._getEnchainedText = function () {

  var enchainedText = {
    chain: [],
    text: "",
    _root: this._root,

    // Convert a text range into a Range
    offsetTextToNode: function (subStartOffset, subEndOffset) {
      var textLength = enchainedText.text.length;

      // Behaves as substring(start, end)
      if ((subStartOffset === undefined) || (subStartOffset < 0)) {
        subStartOffset = 0;
      }
      else if (subStartOffset > textLength) {
        subStartOffset = textLength;
      }

      if ((subEndOffset === undefined) || (subEndOffset > textLength)) {
        subEndOffset = textLength;
      }
      else if (subEndOffset < 0) {
        subEndOffset = 0;
      }

      // Manage negative lenght by swapping offsets
      if (subEndOffset < subStartOffset) subStartOffset = [subEndOffset, subEndOffset = subStartOffset] [0];

      // Create a Range from the text offset

      var subRange = null;
      var subRangeStartNode, subRangeStartOffset;
      var subRangeEndNode, subRangeEndOffset;


      for (var i = 0; i < enchainedText.chain.length; i++) {
        var chainLink = enchainedText.chain[i];

        // ex. [0, 4] [4, 6] [6, 12] [12, 18] => (6) => [6, 12]
        if ((! subRangeStartNode) && (subStartOffset < chainLink.textEndOffset)) {
          subRangeStartNode = chainLink.node;
          subRangeStartOffset = chainLink.nodeStartOffset + (subStartOffset - chainLink.textStartOffset);
        }

        // ex. [0, 4] [4, 6] [6, 12] [12, 18] => (6) => [4, 6]
        if ((subRangeStartNode) && (subEndOffset <= chainLink.textEndOffset)) {
          subRangeEndNode = chainLink.node;
          subRangeEndOffset = chainLink.nodeStartOffset + (subEndOffset - chainLink.textStartOffset);
          break;
        }
      }

      if (subRangeStartNode && subRangeEndNode) {
        subRange = document.createRange();
        subRange.setStart(subRangeStartNode, subRangeStartOffset);
        subRange.setEnd(subRangeEndNode, subRangeEndOffset);
      }

      return new Range(enchainedText._root, subRange);
    }
  };

  // Don't cycle nodes if there aren't
  if (! this._range) return enchainedText;

    enchainedText.TESTER = [];

  var nodeIterator = document.createNodeIterator(this._range.commonAncestorContainer, NodeFilter.SHOW_TEXT);

  var accumulatorTextOffset = 0;

  var currentNode;
  while (currentNode = nodeIterator.nextNode()) {

    var positionComparedToStart = this._range.startContainer.compareDocumentPosition(currentNode);
    // If startContainer is not a currentNode container (e.x. body), skip previous nodes
    if (! (positionComparedToStart & Node.DOCUMENT_POSITION_CONTAINED_BY) && (positionComparedToStart & Node.DOCUMENT_POSITION_PRECEDING)) {
        continue;
    }

    var positionComparedToEnd = this._range.endContainer.compareDocumentPosition(currentNode);
    // If endContainer is not a currentNode container (e.x. body), ignore following nodes
    if (! (positionComparedToEnd & Node.DOCUMENT_POSITION_CONTAINED_BY) && (positionComparedToEnd & Node.DOCUMENT_POSITION_FOLLOWING)) {
        break;
    }

    var chainLink = {node: currentNode};

    // *** sameNode.compareDocumentPosition(sameNode) => 0 ***

    // currentNode is containerStart: "This [is one node]"
    if (! positionComparedToStart) {
      chainLink.nodeStartOffset = this._range.startOffset;
    }

    // currentNode is containerEnd: "[This is one] node"
    if (! positionComparedToEnd) {
      chainLink.nodeEndOffset = this._range.endOffset;
    }

    // Default range coincides with node.textContent: [0, length]
    chainLink.nodeStartOffset = chainLink.nodeStartOffset || 0;
    chainLink.nodeEndOffset = chainLink.nodeEndOffset || currentNode.length;

    // Slice text
    chainLink.text = currentNode.textContent.substring(chainLink.nodeStartOffset, chainLink.nodeEndOffset);

    // Define text offsets
    chainLink.textStartOffset = accumulatorTextOffset;
    chainLink.textEndOffset = chainLink.textStartOffset + (chainLink.nodeEndOffset - chainLink.nodeStartOffset); // node length
    // For next cycle
    accumulatorTextOffset = chainLink.textEndOffset;

    // Concat the final text
    enchainedText.text += chainLink.text;

    // Push this single link
    enchainedText.chain.push(chainLink);
  }

 // console.log(enchainedText)

  return enchainedText;
};

Object.defineProperty(Range.prototype, "length", {
  get () {
    return (this._range) ? (this._range.toString().length) : (-1);
  }
});


// ********************************** Range END **********************************

// ********************************** TextareaRange END **********************************

/*
  Expose the same public members of Range, but works inside of a TEXTAREA or INPUT content

  Public methods:


  Range.highlight() => Make a selection of the ranged text on the root
  Range.getBoundingClientRect() => Return a DOMRect of the bouding box enclosing the range

  shrinkToSelected

  fitToSelection

  Range.fitToSelection() => Return a range of the selected contect IN THE ROOT, or none if not FIXME COHERENCE


    Range.merge(range) => Return a unified range, both roots must be the same node  FIMEX
  */

function TextareaRange(textBox, _selectionStart, _selectionEnd) {
  this._textBox = textBox;

  this._selectionStart = _selectionStart;
  this._selectionEnd = _selectionEnd;

};

// Convert to string
TextareaRange.prototype.toString = function () {

  if (this._selectionStart === undefined) {
    return "";
  }

  else {
    return this._textBox.value.substring(this._selectionStart, this._selectionEnd);
  }
};

// FIXME Length
Object.defineProperty(TextareaRange.prototype, "length", {
  get () {
    return (this._selectionStart !== undefined) ? (this._selectionEnd - this._selectionStart) : (-1);
  }
});

// Expand all
TextareaRange.prototype.growAll = function () {
  return new TextareaRange(this._textBox, 0, Infinity);
};

// Expand cursor selection: "The |dog is| sleeping" => "|The dog is| sleeping" or "The |dog is sleeping|"
TextareaRange.prototype.growToLeft = function () {
  return new TextareaRange(this._textBox, 0, this._selectionEnd);
};

TextareaRange.prototype.growToRight = function () {
  return new TextareaRange(this._textBox, this._selectionStart, Infinity);
};

// Compress Cursor Selection: "The |cat says| no" => "The ||cat says no" or "The cat says|| no"
TextareaRange.prototype.collapseToLeft = function () {
  return new TextareaRange(this._textBox, this._selectionStart, this._selectionStart);
};

TextareaRange.prototype.collapseToRight = function () {
  return new TextareaRange(this._textBox, this._selectionEnd, this._selectionEnd);
};

TextareaRange.prototype.none = function () {
  return new TextareaRange(this._textBox, undefined, undefined);
};

// Return a range of the selected text, no matter what start/end on this
TextareaRange.prototype.fitToSelection = function () {
  return new TextareaRange(this._textBox, this._textBox.selectionStart, this._textBox.selectionEnd);
};

// TextareaRange.prototype.normalize
TextareaRange.prototype.normalize = function () {
  // A normalized range is always within range [0, max] with max <= length
  if (this._selectionStart === undefined) {
    return new TextareaRange(this._textBox, 0, 0);
  }

  var start = this._selectionStart;
  var end = this._selectionEnd;
  var max = this._textBox.value.length;

  // Infinity is not accepted by setSelectionRange
  if (start > max) {
    start = max;
  }

  if (end > max) {
    end = max;
  }

  return new TextareaRange(this._textBox, start, end);
};

TextareaRange.prototype.highlight = function () {
  // Cannot select an empty range
  if (this._selectionStart === undefined) return;

  var normalized = this.normalize();

  this._textBox.setSelectionRange(normalized._selectionStart, normalized._selectionEnd);
};

// ReplaceText: most browser accept execCommand("insertText", ...) even with TEXTAREA and INPUT elements,
// but some (Firefox) don't. This method simulates the user action better especially for CTRL-Z (undo)
TextareaRange.prototype.replaceText = (function () {
  // Test the execCommand("insertText", ...) functionalities
  function testExecCommand(TAG) {
    const TXT_MATCH = ".";
    // Try to keep track of focused element, preferably script should be executed at beginning
    var focusedElement = document.activeElement;
    var element = document.createElement(TAG);
    element.style.position = "fixed"; // Avoid any scrolling
    element.style.left = "-200px";
    element.style.top = "-200px";
    document.body.appendChild(element);
    element.focus();
    // Double check
    var canExecCommand = document.execCommand("insertText", false, TXT_MATCH) && (element.value === TXT_MATCH);
    document.body.removeChild(element);
    if ("focus" in focusedElement) {
      focusedElement.focus();
      console.log(focusedElement, "was focused");
    }
    return canExecCommand;
  }
  return (testExecCommand("TEXTAREA") && testExecCommand("INPUT")) ?
    // The browser will simulate text insertion by user (they can undo actions)
    (function (text) {
      // Cannot change the text of an empty range
      if (this._selectionStart === undefined) return false;
      this.highlight();
      // Should always return true
      return document.execCommand("insertText", false, text);
    }) :
    // Degrade to TEXTAREA value change, with this option the browser does keep track of past steps
    // and pressing CTRL-Z isn't perfect, may just set to empty the entire content or miss some previous steps
    (function (text) {
      if (this._selectionStart === undefined) return false;
      var value = this._textBox.value;
      var normalized = this.normalize();
      this._textBox.value = value.substring(0, normalized._selectionStart) + text + value.substring(normalized._selectionEnd)
      //
      var position = normalized._selectionStart + text.length;
      this._textBox.setSelectionRange(position, position);
      this._textBox.focus();
      return true;
    });
})();

TextareaRange.prototype.search = function (pattern) {

  // Force pattern into a RegExp as this is standard behavior in js methods
  if (! (pattern instanceof RegExp)) pattern = new RegExp(pattern);

  var subText = this._textBox.value.substring(this._selectionStart, this._selectionEnd);

  var matched = pattern.exec(subText);

  if (matched) {
    return new TextareaRange(this._textBox,
                             this._selectionStart + matched.index,
                             this._selectionStart + matched.index + matched[0].length
    );
  }

  // Otherwise return none
  return new TextareaRange(this._textBox, undefined, undefined);
};

TextareaRange.prototype.merge = function (range) {

  if (! (range instanceof TextareaRange) || ! (range._textBox.isSameNode(this._textBox))) throw new Error("Argument of TextareaRange.merge must be a TextareaRange with same textBox");

  if (this._selectionStart === undefined) {
    return new TextareaRange(this._textBox, range._selectionStart, range._selectionEnd);
  }

  else if (range._selectionStart === undefined) {
    return new TextareaRange(this._textBox, this._selectionStart, this._selectionEnd);
  }

  else {
    return new TextareaRange(this._textBox,
                             Math.min(this._selectionStart, range._selectionStart),
                             Math.max(this._selectionEnd, range._selectionEnd)
    );
  }
};


// Based on faux div technique https://github.com/component/textarea-caret-position/conblob/master/index.js
TextareaRange.prototype.getBoundingClientRect = (function () {
// FIXME

  return function () {

    // Native object returned by getBoundingClientRect():
    // DOMRect: Chromium-like, Mozilla; .x .y supported; accept new DOMRect(...)
    // ClientRect: Edge; .x .y unsupported, cannot create new ClientRect(...)
    // So we return a non-standard object {left, top, width, height, right, bottom} for now

    // Empty range
    if (this._selectionStart === undefined) return {left: -1, top: -1, width: 0, height: 0, right: -1, bottom: -1};

    console.time("getBoundingClientRect.var");

    // Create a mirrored div
    var fauxDiv = document.createElement("DIV");
    // Created a faux span to extract the client rect
    var fauxSpan = document.createElement("SPAN");
    console.timeEnd("getBoundingClientRect.var");


    console.time("getBoundingClientRect.editStyle");

    var editStyle = getComputedStyle(this._textBox);
    // Transfer the element's properties to the div
    Object.assign(fauxDiv.style, editStyle);
  //  Object.getOwnPropertyNames(editStyle).forEach(function (s) {
  //    fauxDiv.style[s] = editStyle[s];
  //  });

    console.timeEnd("getBoundingClientRect.editStyle");
    // Set position off-screen
    fauxDiv.style.position = "absolute";
    fauxDiv.style.left = "-9999px";
    fauxDiv.style.top = "-9999px";
    // not 'display: none' because we want rendering
    fauxDiv.style.display = "block";
    fauxDiv.style.visibility = "hidden";

    // Words can be broken if are too long to emulate TEXTAREAs. INPUTs are always single line.
    if (this._textBox.nodeName === "TEXTAREA") {
      // Words can be broken if are too long to emulate TEXTAREAs.
      fauxDiv.style.wordWrap = "break-word";
      // Preserve whitespace, break on spaces to simulate TEXTAREAs
      fauxDiv.style.whiteSpace = "pre-wrap"
    }

    else if (this._textBox.nodeName === "INPUT") {
      // INPUTs are always single line.
      fauxDiv.style.wordWrap = "normal";
      // Preserve whitespace, never break on spaces as INPUTs don't
      fauxDiv.style.whiteSpace = "pre"
    }

    // overflow must be forced each time after changing style since it gets defaulted
    // under content-box style, FIXME comment for Chrome: clipped content and do not render a scrollbar; since scrollbars on textareas are outside whereas on divs inside
    if (editStyle.boxSizing === "content-box") {
      fauxDiv.style.overflow = "hidden";
    }

    // the second special handling for input type="text" vs textarea: spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
    // if (element.nodeName === 'INPUT') fauxDiv.textContent = fauxDiv.textContent.replace(/\s/g, '\u00a0'); FIXME


    // Build "left side |range text| right side" with 3 children elements
    var leftValue = this._textBox.value.substring(0, this._selectionStart);
    var middleValue = this._textBox.value.substring(this._selectionStart, this._selectionEnd);
    var rightValue = this._textBox.value.substring(this._selectionEnd);

    // For collapsed range not preceded by any text: "|| my text" => span would be rendered empty
    if ((! middleValue.length) & (! leftValue.length || leftValue.endsWith("\n"))) {
      middleValue = "|";
    }

    fauxDiv.textContent = leftValue;
    fauxSpan.textContent = middleValue;
    fauxDiv.appendChild(fauxSpan);
    // For proper rendering, it needs to add right side.
    // Ex: "a| |word" vs "a| |verylongwordnonspacedsentence"
    // may be broken differently according to style rules
    fauxDiv.appendChild(document.createTextNode(rightValue));
    // fauxDiv needs being added to the body or it won't be rendered
    document.body.appendChild(fauxDiv);


    // fauxSpan is the candidate for the bounding rect but must be translated
//    console.time("getBoundingClientRect.fauxDiv.getBoundingClientRect");
    var fauxDivCoords = fauxDiv.getBoundingClientRect()
//    console.timeEnd("getBoundingClientRect.fauxDiv.getBoundingClientRect");
 //   console.time("getBoundingClientRect.fauxSpan.getBoundingClientRect");
    var fauxSpanCoords = fauxSpan.getBoundingClientRect();
 //   console.timeEnd("getBoundingClientRect.fauxSpan.getBoundingClientRect");
//    console.time("getBoundingClientRect._textBox.getBoundingClientRect");
    var textBoxCoords = this._textBox.getBoundingClientRect();
 //   console.timeEnd("getBoundingClientRect._textBox.getBoundingClientRect");
    document.body.removeChild(fauxDiv);

    // Translate coordinate system from fauxSpan to textBox, taking into account the scrolling
    var _left, _top;
    return {
      left: _left = fauxSpanCoords.left + textBoxCoords.left - fauxDivCoords.left - this._textBox.scrollLeft,
      top: _top = fauxSpanCoords.top + textBoxCoords.top - fauxDivCoords.top - this._textBox.scrollTop,
      width: fauxSpanCoords.width,
      height: fauxSpanCoords.height,
      right: _left + fauxSpanCoords.width,
      bottom: _top + fauxSpanCoords.height
    };
  };
})();


// ********************************** TextareaRange END **********************************
