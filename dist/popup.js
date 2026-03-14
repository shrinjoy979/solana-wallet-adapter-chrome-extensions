/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!**********************!*\
  !*** ./src/popup.ts ***!
  \**********************/

const btn = document.getElementById("myBtn");
const statusEl = document.getElementById("status");
btn.addEventListener("click", () => {
    statusEl.textContent = "Button clicked!";
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
            const message = { action: "hello" };
            chrome.tabs.sendMessage(tabId, message);
        }
    });
});

/******/ })()
;
//# sourceMappingURL=popup.js.map