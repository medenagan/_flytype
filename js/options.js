/*
 *  options.js (v) 1.0.0
 *
 *  Helper to normalize .chrome and .runtime objects accross different browsers
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

"use strict";



var dbHandler = new CMultiCallbackHelper();
var dbInfo = {};

// Extract asynch info on n-grams
meta.chrome.runtime.sendMessage({ngram: {getInfo: true}}, dbHandler.callback(function (response) {
  if (response && response.arrGram) dbInfo = response;
}));


var sh = new  SharedWorker("/js/sharedw.js");
console.log("sh", sh);

sh.port.start();

sh.port.postMessage("kokko" + Date.now());

sh.port.onmessage = function(e) {
  console.log('Message received from worker', e.data);
}


$(document).on("pagecreate", function() {

  var $gramPaste = $("input#gram-paste");
  var $popupGramPasteError = $("div#popup-gram-paste-error");
  var $pGramPasteError = $("p#label-gram-paste-error");
  var $gramFile = $("input#gram-file");
  var $gramFileProgress = $("#gram-file-progress");
  var $exportCSV =$("button#export-csv");
  //
  var $statsPressedKeys = $("span#stats-pressed-keys");
  var $statsSavedKeys = $("span#stats-saved-keys");
  var $statsReplacedWords = $("span#stats-replaced-words");
  var $clearStats = $("input#clear-stats");



  $(".updatesettings input").on("change", function(e) {
    console.log("Settings changed");
  });


  $clearStats.click(function () {
    if (confirm("WARNING: This action can't be undone.\n\nAre you sure you want to clear all statistics?")) {
      stats.clear();
    }
  });

  function printStats(stats) {
    $statsPressedKeys.text(stats.pressedKeys || "-");
    $statsSavedKeys.text(stats.savedKeys || "-");
    $statsReplacedWords.text(stats.replacedWords || "-");
  }

  stats.listen(printStats);
  stats.read(printStats);

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

  }




	function tasinantaFile(fileList) {
    $gramFile.addClass("ui-state-disabled");
    $gramFileProgress.val(0).slider("refresh");

    setTimeout(function () {
		  var fileScraper = new Worker("/js/ngramScrapeThread.js");

		  fileScraper.addEventListener("message", function (e) {
        console.log(e);
        var job = e.data;
        $gramFileProgress.val(job.progress).slider("refresh");
        if (job.event === "oncomplete") $gramFile.removeClass("ui-state-disabled");
		  });

		  fileScraper.postMessage({scrapeFromFilelist: fileList});
    }, 100);

  }



  $gramFile.on("input", function (e) {
    tasinantaFile(e.target.files)
  });

  function showGramPopup(msg) {
    $pGramPasteError.text(msg);
    console.log($pGramPasteError);
    $popupGramPasteError.popup("open");
  }

  $gramPaste.on("keydown", function(e) {
    if (! e.ctrlKey) {
      showGramPopup("Please, copy and paste a text content instead.");
      e.preventDefault();
    }

    // Allow CTRL but accept only CTRL-V, text will be zeroed on onPaste handling
    else if (e.key !== "v" && e.key !== "V") {
      e.preventDefault();
    }
  });

  // Drag and drop of text
  $gramPaste.on("input", function(e) {
    $gramPaste.val("");
    showGramPopup("Please, copy and paste a text content instead.");
    $gramPaste.blur();
  });

  var _onPasting = false; var _hashes = {};

  $gramPaste.on("paste", function(e) {
    // Don't actually paste it on the input
    e.preventDefault();

    if (_onPasting) return;

    _onPasting = true;
    $gramPaste.val("。。。");

    var pastedText = e.originalEvent.clipboardData.getData("text");

    if (! pastedText) {
      _onPasting = false;
      return;
    }

    var hash = String(sHash32(pastedText));
    console.log("hash", hash);

    if (_hashes.hasOwnProperty(hash)) {
      showGramPopup("Sorry, already scraped it. If you want it to be counted twice, please refresh the page.");
      _onPasting = false;
      return;
    }

    _hashes[hash] = true;

    meta.chrome.runtime.sendMessage({ngram: {excerptText: pastedText}}, function (response) {
      console.log("excerptText", response);
      if (response) showGramPopup((response.length) ? (response.length + " words sent to the grambase.") : ("No words found, sorry."));
      _onPasting = false;
    });
  });

  $exportCSV.click(function () {
    $exportCSV.prop("disabled", true);
    meta.chrome.runtime.sendMessage({ngram: {getInfo: {csv: true}}}, function (response) {
      $exportCSV.prop("disabled", false);
      console.log("getInfo", response);
    });
  });

  var $dbTable = $("table#db-table");
  var $dbTableBody = $("table#db-table tbody");
  var DBTABLE_TD   = "<td class='ui-body ui-body-a'></td>";
  var DBTABLE_TD_B = "<td class='ui-body ui-body-b'></td>";

  dbHandler.once(function () {
    // dbInfo can be undefined in case of error
    if (! dbInfo) return;

    $dbTableBody.empty();

    dbInfo.arrGram.forEach(function (n) {
      var  nDetail = dbInfo.details[n];
/*
      console.time("info");
      var h1 = nDetail.arrC.filter(function (c, i) {
        return c !== 0;
      });
*/
/*
      var totC = nDetail.totC;
      var subC = 0;
      nDetail.arrWeigth = nDetail.arrC.map(function (c, i) {
        subC +=c;
        return subC / totC;
      });
*/
      console.log(n, nDetail);
      console.timeEnd("info");








      console.log("Evvai, posso disegnare qui", nDetail);
      // N-gram	Length	Occurrences	Lowest	Highest	Coverage
      $dbTableBody.append($encapsulateElements("<tr></tr>",
        nDetail.$nGram = $(DBTABLE_TD),
        nDetail.$length = $(DBTABLE_TD),
        nDetail.$occurrencies = $(DBTABLE_TD),
        nDetail.$lowest = $(DBTABLE_TD),
        nDetail.$highest = $(DBTABLE_TD),
        nDetail.$coverage = $(DBTABLE_TD_B)
      ));
      nDetail.$updateText = function () {
        nDetail.$nGram.text(n);
        nDetail.$length.text(nDetail.length.toLocaleString("en-US"));
        nDetail.$occurrencies.text(nDetail.totC.toLocaleString("en-US"));
        nDetail.$lowest.text(nDetail.minC.toLocaleString("en-US"));
        nDetail.$highest.text(nDetail.maxC.toLocaleString("en-US"));
        nDetail.$coverage.text("100%");
        $dbTable.table("refresh");
      };
      nDetail.$updateText();
    });
  });
});




// <parentElement><element1></element1><element2></element2>...</parentElement>
function $encapsulateElements(parentElement) {
  var $parentElement = $(parentElement);
  $parentElement.append(Array.prototype.slice.call(arguments, 1));
  return $parentElement;
}
