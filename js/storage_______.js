"use strict";

/*
  chrome.storage.sync has some limitation, for memory and access

  Storage adds the " meta " property which store data first locally, then try to get to set them to Synch

  It reservs "_meta_"- prefix for keys on both sync and local

*/


(function () {
  if (window.Storage) console.warn("Storage seems already defined");

  var meta = {set: _meta_set};

  var Storage = {
    sync: chrome.storage.sync,
    local:  chrome.storage.local,
    meta: meta
  };

  function _meta_set (dictionary, callback) {
  //  if (
    //var obj = JSON.parse(JSON.stringify(keys));
    var keys = Object.keys(dictionary);

    var metaObj = {};

    keys.forEach(function (k) {
      metaObj["_meta_" + k] = dictionary[k];
    });

    Storage.local.get(["_meta_"], function (_meta_) {
      if (chrome.runtime.lastError) throw new Error("Storage.meta.set: " + chrome.runtime.lastError);
      keys.forEach(function (k) {
        _meta_[k] = "local";
      });
      metaObj._meta_ = _meta_;
      Storage.local.set(metaObj, function () {
        console.log("MetaSetting", chrome.runtime.lastError);
      });
    });
  }

  function _meta_get (dictionary, callback) {
//
  }

  Object.freeze(Storage);

  window.Storage = Storage;

})();

console.log(Storage);

var h = {};

"X".repeat(10).split("").forEach((x, i) => h[i] = "汉");

Storage.meta.set(h, function () {
  console.log("Settando");


});



function CSortedArray() {

}

CSortedArray.prototype = Array;

var p = new CSortedArray();










