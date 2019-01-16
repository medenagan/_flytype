/*
 *  ext.js (v) 0.0.1
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
var global = (function () {
  return this;
})();

(function (root) {
  "use strict";

  console.log("global", global, global.chrome, global.browser);

  if (! root) root = global;

  if (root.meta_chrome) return;

  // chrome = Chrome, Opera, FireFox (legacy)
  // browser = Edge, Firefox (native)
  var _chrome = global.chrome || global.browser; //(typeof chrome !== "undefined") ? chrome : browser;

  // Set the __proto__ as .chrome, so we can redefine some methods safely
  var meta_chrome = root.meta_chrome = _chrome; //chrome // FIXME Object.create(_chrome);  https://github.com/Rob--W/webextension-polyfill/commit/1ed579f2a2956eab2f99b795f0abea5b99171a2c

  // openOptionsPage()
  // YES: Chrome, Opera, Firefox updated
  // NO: Edge, older versions
  var _rt = _chrome.runtime;
  meta_chrome.openOptionsPageNow = (_rt.openOptionsPage instanceof Function) ? _rt.openOptionsPage :
                                     (function () {
                                       var manifest = meta_chrome.runtime.getManifest();
                                       var url = (manifest.options_page) ? manifest.options_page : (manifest.options_ui && manifest.options_ui.page) ? manifest.options_ui.page : "error_options";
                                       meta_chrome.tabs.create({'url': url});
                                     });
})();
