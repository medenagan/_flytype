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
  meta.chrome.runtime.openOptionsPage();
});

document.getElementById("visit").addEventListener("click", function (e) {
  window.open("https://github.com/medenagan/flytype");
});
