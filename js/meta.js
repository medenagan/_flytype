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

  // Set the __proto__ as .chrome, so we can redefine some methods safely
  //var meta.chrome = root.meta.chrome = _chrome; //chrome // FIXME Object.create(_chrome);  https://github.com/Rob--W/webextension-polyfill/commit/1ed579f2a2956eab2f99b795f0abea5b99171a2c

  // openOptionsPage()
  // YES: Chrome, Opera, Firefox updated
  // NO: Edge, older versions
  var _rt = meta.chrome.runtime;
  // FIXME;
  meta.chrome.openOptionsPageNow = (_rt.openOptionsPage instanceof Function) ? _rt.openOptionsPage :
                                     (function () {
                                       var manifest = meta.chrome.runtime.getManifest();
                                       var url = (manifest.options_page) ? manifest.options_page : (manifest.options_ui && manifest.options_ui.page) ? manifest.options_ui.page : "error_options";
                                       meta.chrome.tabs.create({'url': url});
                                     });
  return meta;
})();
