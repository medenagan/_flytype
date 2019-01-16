/*
 *  background.js (v) 0.0.1
 *
 *  Helper to normalize .chrome and .runtime objects accross different browsers
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

"use strict";

var WAIT_MINS_AUTO_FLUSH = 10.0;

// Provide async word matching
var wkMatcher = new Worker("js/matcherThread.js");




//example of using a message handler from the inject scripts
meta_chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

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

  else if (request.loadDictionary) {
    return aLoadDictionary(request.loadDictionary, sendResponse);
  }


 // meta_chrome.extension.pageAction.show(sender.tab.id);
 // sendResponse();
});



meta_chrome.runtime.onInstalled.addListener(function() {
  // Create a popup for editable
  var menuContexts = ["editable"];
  var menuParentId = meta_chrome.contextMenus.create({title: "FlyType", id: "flytype-menu-parent", contexts: menuContexts});
  meta_chrome.contextMenus.create({title: "Pause", id: "flytype-menu-pause",
    parentId: menuParentId, type: "checkbox", contexts: menuContexts
  });

  console.log("onStartup.");
   // chrome.browserAction.setBadgeText({text: ""});
});


meta_chrome.contextMenus.onClicked.addListener(function(info, tab) {
  console.log("item " + info.menuItemId + " was clicked");
  console.log("info: " + JSON.stringify(info));
  console.log("tab: " + JSON.stringify(tab));
})




meta_chrome.runtime.onStartup.addListener(function() {
  console.log("onStartup.");
   // chrome.browserAction.setBadgeText({text: ""});
});


meta_chrome.runtime.onSuspend.addListener(function() {
//  ngram.flush();
  console.log("onSuspend / Unloading.");
   // chrome.browserAction.setBadgeText({text: ""});
});

// Test of i
var i = 0;
meta_chrome.alarms.create({delayInMinutes: WAIT_MINS_AUTO_FLUSH, periodInMinutes: WAIT_MINS_AUTO_FLUSH});
meta_chrome.alarms.onAlarm.addListener(function() {
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
  xmlhttp.open("GET", meta_chrome.extension.getURL("json/_" + languageCode + ".json"));

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
