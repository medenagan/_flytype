/*
 *  matcherThread.js (v) 0.0.1
 *
 *  A worker to n-grammirize data into the database
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

 "use strict";

(function () {

  const BEING_WORKER = (typeof importScripts !== "undefined");

  // Expecting lib.js already loaded if matcherThread is used as content script
  if (BEING_WORKER) {
    importScripts("lib.js");
    importScripts("matcher.js");
  }

  console.log("Sono un worker?", BEING_WORKER);

  var matcher;

  self.addEventListener("message", function (e) {
    console.log("worker", e);
    if (e.data.getMatches) {
      var matches = matcher.getMatches(e.data.getMatches);
      console.log(matches);
      e.ports[0].postMessage(matches);
    }

    else if (e.data.words) {
      console.log("Worker got some words");
      matcher = new Matcher(e.data.words);
    }
  });
})();




 //   console.time("getMatch__3");
  //    console.log(_wordMatcher.getMatches_3.bind(this, anatomy.word).testTimes(10));
 //   console.timeEnd("getMatch__3");

   // console.time("getMatch____2");
    //  console.log(_wordMatcher.getMatches_2.bind(this, anatomy.word).testTimes(10));
  //  console.timeEnd("getMatch____2");
