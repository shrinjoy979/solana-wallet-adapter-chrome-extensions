/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!************************!*\
  !*** ./src/content.ts ***!
  \************************/

// src/content.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "hello") {
        alert("Hello from TypeScript extension!");
    }
});

/******/ })()
;
//# sourceMappingURL=content.js.map