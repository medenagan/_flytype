/*
 *  popup.js (v) 1.0.0
 *
 *  Script running when the popup panel is opened by user
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

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
