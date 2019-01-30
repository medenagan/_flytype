/*
 *  dom.js (v) 0.0.1
 *
 *  Content script adding a fly into the dom
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

 "use strict";



var TAG_POPUP_WAIT = 1750;

var SPACE_LIKE_CHARS = ". :;!?,";

var REX_WORD_BREAK_CHAR = /[^-'0-9A-Za-zÀ-ÖØ-öĀ-ſ]/;

var KEY_BACKSPACE = 8;
var KEY_SPACE = 32;
var KEY_LEFT_ARROW = 37;
var KEY_UP_ARROW = 38;
var KEY_RIGHT_ARROW = 39;
var KEY_DOWN_ARROW = 40;
var KEY_DELETE = 46;

// Main

var fly = new Fly();

document.addEventListener("keydown", onKeydown);
document.addEventListener("keyup", onKeyup);
document.addEventListener("focusin", onFocusIn);
document.addEventListener("focusout", onFocusOut);
document.addEventListener("mousedown", onMouseDown);
window.addEventListener("beforeunload", onBeforeUnload);
settings.listen(onSettingsChanged);
settings.read(onSettingsFirstlyRead);
meta.chrome.runtime.onMessage.addListener(onMessage);

/*

INSTRUCTIONS:


*/


function aLoadDictionary (language, callback) {
  meta.chrome.runtime.sendMessage({loadDictionary: language}, callback);
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

  meta.chrome.runtime.sendMessage({
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



function onSettingsFirstlyRead(data) {
  fly.disabled = data.paused;
}

function onSettingsChanged(oldData, newData) {
  if (oldData.paused !== newData.paused) {
    fly.disabled = newData.paused;
  }
}

function onMessage(request, sender, sendResponse) {
  if (!sender.tab && request.trigger) {
    if (fly.shown()) {
      fly.hide();
    }
    else if (document.activeElement === fly.target) {
      fly.trigger({show: true, synch: true});
    }
  }
}

function onBeforeUnload(e) {
  stats.save();
}

function onMouseDown(e) {
  if (e.target === fly.target) {
    fly.assumeNewCaret();
  }
}

function onFocusIn(e) {
  if (isTypeable(e.target))
    fly.target = e.target;
}

function onFocusOut(e) {
  // If fly was enabled on the target, n-grammize the content
  flushElement(e.target);
  fly.target = null;
}



/* Comparison DOWN and key UP:
   DOWN: when user types fast, they don't realease some key: e.x. yoUR with U not released before R is pressed
         this means that UP is not triggered in these cases, DOWN instead captures these sequencies
   UP: JavaScript handles character typing after DOWN and before UP, meaning  on DOWN the character is not
         printed yet. Also, any arrow to move the cursor has not been handled, so script must emulate it all

   Suggestions are appSolution: Suggestion is applied at DOWN, but if forces the calculation of suggestion which is normally done on UP so that i.e. " yoUR " is not replace as " yoU "
 */

// Used to determing the long press
var _releasedKey_ = true;
// When set on true, the keyUp event will ignore and not show any suggestions
var _preventKeyUp_ = false;

function onKeydown (e) {

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

  // Memorize capslock
  if (e.key.length === 1)
    fly.setCapslock(e.key, e.shiftKey);

  // Exit event if the target is not of our interest
  if (fly.target !== e.target)
    return;

  var isReplacingKey = (SPACE_LIKE_CHARS.indexOf(e.key) > -1) || (e.key === "Enter"); // FIXME

  if (longPress) console.log("LONG /" + e.key + "/"); // FIXME

  // If user has pressed a sequence of keys + " " (or "," ...), since onKeyUp event has not been fired yet, force suggestions before handling
  if (longPress && isReplacingKey) {
    fly.trigger({synch: true, show: true});
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
    var replaced = fly.replace();
    if (replaced) {
      stats.savedKeys = replaced;
      stats.replacedWords = +1;
    }

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
      var replaced = fly.replace();
      if (replaced) {
        stats.savedKeys = replaced;
        stats.replacedWords = +1;
      }
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
     - CTRL / ALT is unpressed
     - A printable character was typed
     -   cancellation by backspace or DEL occurred
  */

  if ( (fly.target === e.target) && (! e.ctrlKey) && (! e.altKey) &&
       (e.key.length === 1 || e.keyCode === KEY_BACKSPACE || e.keyCode === KEY_DELETE))
  {
    fly.trigger({show: true, synch: !true });
    // Increase only for printable chars
    if (e.key.length === 1) stats.pressedKeys = +1;
  }
};
