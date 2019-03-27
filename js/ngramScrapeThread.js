/*
 *  ngramScrapeThread.js (v) 1.0.0
 *
 *  Helper to normalize .chrome and .runtime objects accross different browsers
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

 "use strict";

console.log(self);

self.addEventListener("message", function (e) {
  var filelist;

  if ((filelist = e.data.scrapeFromFilelist) && (filelist instanceof FileList)) {
    tasinantaFile(filelist);
  }
});


function tasinantaFile(fileList) {
  var job = new CFileListAsyncJob(fileList);

  job.onload = function (file, event) {
    self.postMessage({event: "onload", progress: job.progress});
  };

  job.oncomplete = function () {
    self.postMessage({event: "oncomplete", progress: job.progress});
  }

  job.start();
}









  // CFileListAsyncJob is okay for many files with small size, since each one is loaded after the previous one has been handled
  // Cannot be used for big files
  function CFileListAsyncJob(fileList) {
    if (! (fileList instanceof FileList)) throw new Error("new CFileListAsyncJob(<must be a FileList>)");

    var _self = this;
    var _started = false;
    var _stopped = false;
    var _index = 0;

    function _onLoad(file, event) {
      if (_self.onload instanceof Function) _self.onload(file, event);
      ++_index;
      setTimeout(_next, 0);
    }

    function _next() {
      if (_index < fileList.length) {
        var file = fileList.item(_index);
			  var reader = new FileReader();
				reader.onload = _onLoad.bind(_self, file);
				reader.readAsText(file);
      }

      else {
        //--_index;
        if (_self.oncomplete instanceof Function) _self.oncomplete();
      }
    }

    this.start = function () {
      if (_started) return;
      _started = true;
      setTimeout(_next, 0);
    };

    this.stop = function () {
      _stopped = true;
      // FIXME
    };

    Object.defineProperty(this, "progress", {get: function () {
      return (fileList.length) ? (_index / fileList.length) : (0);
    }});

    this.toJSON = function () {
      return {progress: _self.progress};
    }

  }
