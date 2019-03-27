/*
 *  ngramClientBackground.js (v) 1.0.0
 *
 *  A mirror for ngram communication between content script and extension worker
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */


(function() {

  // ngramServer needs the indexdb context to be the extension's
  // so cannot be loaded directly on content script
  var ngramServer = new Worker("js/ngramServer.js");

  var ports = [];

  // Transmit to content scripts what worker says
  ngramServer.onmessage = function(event) {
    console.log("ngramServer says", event.data, event);
    ports.forEach(function (eachPort) {
      eachPort.postMessage(event.data);
    });
  };

  // Listen for content script requests
  meta.chrome.runtime.onConnect.addListener(function(port) {

    console.log("CREO PORTA", port);

    if (! port.name.startsWith("ngram"))
      return;

    ports.push(port);

    port.onDisconnect.addListener(function () {
      ports = ports.filter(function (eachPort) {
        return eachPort !== port;
      });
    });

    port.onMessage.addListener(function(request) {
      console.log("CONTENT REQUIRING", request);
      ngramServer.postMessage(request);
    });

  });

  /*
        setTimeout(function () {
          port.postMessage({request: request, response: "ok" + request._id});
        }, 500)
      });
  */


  console.log("post message", ngramServer.postMessage({
    hello: 4
  }));




})();
