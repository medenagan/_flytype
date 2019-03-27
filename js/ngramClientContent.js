/*
 *  ngramClientContent.js (v) 1.0.0
 *
 *  A module porting ngram worker functionalities to content side
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

var ngram = (typeof ngram !== "undefined") ? ngram : (function() {

  // Connect to ngramClientBackground
  var port = meta.chrome.runtime.connect({
    name: "ngram"
  });

  port.onMessage.addListener(function(msg) {
    console.log("BACKGROUDN received message", msg);
  });

  var ngramClient = {};

  // public methods from ngramServer
  var publicMethods = ["hello", "getMethodNames", "getNPlusOneFromArray", "getNPlusOneFromString"];

  // Each method return a promise
  publicMethods.forEach(function(name) {

    ngramClient[name] = function() {

      // args
      var params = Array.prototype.slice.call(arguments);

      // A uniq id for this invocation
      var id = Math.floor(Math.random() * 1e15).toString(36) +
        Date.now().toString(36);

      // Wrap the messaging exchange into a Promise
      var promise = new Promise(function(resolve, reject) {

        var handler = function(message) {
          var mine = message.request._id === id;
          console.log("#", id, mine, message);

          if (! mine) {
            return;
          }

          // Remove this handler
          port.onMessage.removeListener(handler);

          var response;

          if (! message) {
            reject("Invalid message");
          }

          else if (! (response = message.response)) {
            console.log(message.response, response);
            reject("Invalid response");
          }

          else if (response.error) {
            // Assume errors are {response: {error: true, reason: "blabla"}}
            reject(response.reason);
          }

          else {
            resolve(response.value);
          }
        }

        // Add a disposable handler
        port.onMessage.addListener(handler);
      });

      // Post to ngramClientBackground
      port.postMessage({
        _id: id,
        name: name,
        params: params
      });

      return promise;
    }
  });

  return ngramClient;

})();
