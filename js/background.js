/*
 *  background.js (v) 1.0.0
 *
 *  Main background module
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

"use strict";

var WAIT_MINS_AUTO_FLUSH = 10.0;

var ICONS = {}, ICONS_PAUSED = {};
([16, 32, 48, 64, 128]).forEach(function (value) {
  ICONS[value] = "/png/flytype-" + value + ".png";
  ICONS_PAUSED[value] = "/png/flytype-paused-" + value + ".png";
});

// Create a popup for editable
var ID_MENU_PARENT = "flytype-menu-parent";
var ID_MENU_PAUSE = "flytype-menu-pause";
var menuContexts = ["editable"];
var menuParentId;

chrome.contextMenus.removeAll(function () {
  menuParentId = meta.chrome.contextMenus.create({title: "FlyType", id: ID_MENU_PARENT, contexts: menuContexts});
  meta.chrome.contextMenus.create({title: "Pause", id: ID_MENU_PAUSE,
    parentId: menuParentId, type: "checkbox", contexts: menuContexts
  });
});

meta.chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === ID_MENU_PAUSE) {
    settings.paused = info.checked;
  }
})

function setIcon() {
  meta.chrome.browserAction.setIcon({
    path: (settings.paused ? ICONS_PAUSED : ICONS)
  });

  meta.chrome.contextMenus.update(ID_MENU_PAUSE, {checked: settings.paused});
}

meta.chrome.runtime.onInstalled.addListener(function() {
  console.log("onInstalled.");
});

settings.listen(function(oldData, newData) {
  if (oldData.paused !== newData.paused)
    setIcon();
});

settings.read(setIcon);



meta.chrome.commands.onCommand.addListener(function(command) {
  switch (command) {

    // CTRL + SPACE  disable or enable flytype on the page
    case "toggle":
      settings.paused = !settings.paused;
      break;

    // ALT + X: show/hide suggestions FIXME
    case "trigger":
      meta.chrome.tabs.query({active: true}, function (tabs) {
        tabs.forEach(function (tab) {
          meta.chrome.tabs.sendMessage(tab.id, {trigger: true});
        });
      });
      break;
  }
});



// Provide async word matching
var wkMatcher = new Worker("js/matcherThread.js");


var ngramWorker = new Worker("js/ngramDB.js");

ngramWorker.onmessage = function (result) {
  console.log("Worker says", result);
};





meta.chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

  console.log(request);

  if (request.matcher) {
    var channel = new MessageChannel();
    channel.port1.onmessage = function (e) {
      sendResponse(e.data);
    };
    wkMatcher.postMessage(request.matcher, [channel.port2]);
    return true; // asynch
  }

  else if (request.ngram) {
    if (request.ngram.excerptText) {
      ngram.excerptText(request.ngram.excerptText, sendResponse);
      return true; // asynch
    }

    else if (request.ngram.excerptFiles) {
      console.log("excerptFiles", request.ngram.excerptFiles instanceof FileList, request.ngram.excerptFiles);
    }

    else if (request.ngram.getInfo) {
      ngram.getInfo(request.ngram.getInfo, sendResponse);
      return true; // asynch
    }
  }

  else if (request.nice1) {
    console.log("LLLL");
    ngram.niceGetNPlusOneGrams(request.nice1, sendResponse)
    return true;
  }

  else if (request.nice2) {
    ngramWorker.onmessage = sendResponse;
    ngramWorker.postMessage({niceGetNPlusOneGrams: request.nice2});
    return true;
  }

  else if (request.loadDictionary) {
    return aLoadDictionary(request.loadDictionary, sendResponse);
  }


 // meta.chrome.extension.pageAction.show(sender.tab.id);
 // sendResponse();
});







meta.chrome.runtime.onStartup.addListener(function() {
  console.log("onStartup.");
   // chrome.browserAction.setBadgeText({text: ""});
});


// Test of i
var i = 0;
meta.chrome.alarms.create({delayInMinutes: WAIT_MINS_AUTO_FLUSH, periodInMinutes: WAIT_MINS_AUTO_FLUSH});
meta.chrome.alarms.onAlarm.addListener(function() {
  console.log("Flush, Hello, world!", ++i, new Date())
});



var dictionary_cache = {};
function aLoadDictionary(languageCode, callback) {
  if (dictionary_cache.hasOwnProperty(languageCode)) {
    wkMatcher.postMessage(dictionary_cache[languageCode]);
    callback(dictionary_cache[languageCode]);
    return false; // synch in handler
  }

  else {
    aJSON(languageCode, function (response) {
      if (! response.error) {
        dictionary_cache[languageCode] = response;
      }
      wkMatcher.postMessage(response);
      callback(response);
    });
    return true; // asynch
  }
}

function aJSON(languageCode, callback) {
  if (! (callback instanceof Function)) return;

  var xmlhttp = new XMLHttpRequest();
  xmlhttp.responseType = "json";
  xmlhttp.open("GET", meta.chrome.extension.getURL("json/_" + languageCode + ".json"));

  xmlhttp.onerror = function () {
    console.error("aJSON.onError", this);
    callback({error: true});
  };

  xmlhttp.onabort = function () {
    console.error("aJSON.onAbort", this);
    callback({error: true});
  };

  xmlhttp.onload = function() {
    if (this.response) {
      callback(this.response);
    }
    else {
      console.error("aJSON.onload", this);
      callback({error: true});
    }
  };
  xmlhttp.send();
}
