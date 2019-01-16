"use strict";

document.getElementById("options").addEventListener("click", function (e) {
  meta_chrome.openOptionsPageNow();
});

document.getElementById("settings").addEventListener("click", function (e) {
  meta_chrome.storage.sync.set( {'settings': {maxSuggestions: -90, santo: 23, vero: "leopalds"}});
  console.log("SYNCSET");
});

document.getElementById("settingsClear").addEventListener("click", function (e) {
  meta_chrome.storage.sync.remove('settings');
});

  meta_chrome.storage.sync.get("settings", function (result) {
    // FIXME ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    console.log(result.settings);
  });
