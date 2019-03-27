/*
 *  ngramServer.js (v) 1.0.0
 *
 *  A worker to n-grammirize data into the database
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

"use strict";

var ngram = {};

importScripts("ngramDB.js");

var ngram = ngramGetGlobalObject();

// ngram

// call a Promise ngram.foo(a, b, callback) from client message
// {name:foo, params: [param0, param1]}
function callFunctionFromClientMessage(message) {

  var request = message.data;

  var fn = ngram[request.name];

  if (typeof fn !== "function") {
    fn = function () {
      return Promise.reject("Unrecognized function to be invoked");
    }
  }

  var params = request.params;

  if (! Array.isArray(params)) {
    params = [params];
  }

  // Call fn on worker side
  var promise;
  try {
    promise = fn.apply(this, params);
  }
  catch (e) {
    promise = Promise.reject(e);
  }

  if (! (promise instanceof Promise)) {
    promise = Promise.resolve(promise);
  }

  // transform promise into message
  promise.then(
    function (value) {
      var response = {
        error: false,
        value: value
      };
      self.postMessage({request: request, response: response});
    },
    function (reason) {
      var response = {
        error: true,
        reason: reason
      };
      self.postMessage({request: request, response: response});
    }
  );
}

self.onmessage = callFunctionFromClientMessage;

ngram.getMethodNames = function () {
  return Object.getOwnPropertyNames(ngram)
    .filter(function (method) {
      return (typeof ngram[method] === "function");
  });
}
