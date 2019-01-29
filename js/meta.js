/*
 *  meta.js (v) 1.0.0
 *
 *  Helper to normalize .chrome and .runtime objects accross different browsers
 *
 *  This file is part of FlyType <https://github.com/medenagan/flytype>
 *
 *  Copyright (C) 2016-2019 Fabio Mereu
 *
 */

// Chromium-like (Opera, ...) and Edge: global === window
// Firefox: global === [Sandbox]

// var global = (function () {
//  return this;
// })();

var meta = (typeof meta !== "undefined") ? meta : (function (root) {
  "use strict";

  var meta = {};

  // chrome = Chrome, Opera, FireFox (legacy)
  // browser = Edge, Firefox (native)
  meta.chrome = (typeof chrome !== "undefined") ? chrome : browser;

  var runtime = meta.chrome.runtime;

  // openOptionsPage()
  // YES: Chrome, Opera, Firefox updated
  // NO: Edge, older versions
  if (typeof runtime.openOptionsPage !== "function") {
    runtime.openOptionsPage = function () {
      var manifest = runtime.getManifest();
      var url = (manifest.options_page)
        ? manifest.options_page
        : (manifest.options_ui && manifest.options_ui.page)
        ? manifest.options_ui.page
        : "error_options";
      meta.chrome.tabs.create({url: url});
    }
  }

  return meta;
})();
