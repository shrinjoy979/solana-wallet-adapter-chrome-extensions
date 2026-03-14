/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/*!**********************!*\
  !*** ./src/popup.ts ***!
  \**********************/

// ── Page elements ──────────────────────────────────────────
const page1 = document.getElementById("page1");
const page2 = document.getElementById("page2");
const page2Subtitle = document.getElementById("page2Subtitle");
// ── Page 1 buttons ─────────────────────────────────────────
const btnCreateWallet = document.getElementById("btnCreateWallet");
const btnHaveWallet = document.getElementById("btnHaveWallet");
// ── Page 2 buttons ─────────────────────────────────────────
const btnEmail = document.getElementById("btnEmail");
const btnRecovery = document.getElementById("btnRecovery");
const btnBack = document.getElementById("btnBack");
// ── Navigation helpers ─────────────────────────────────────
function showPage(pageEl) {
    [page1, page2].forEach(p => p.classList.remove("active"));
    pageEl.classList.add("active");
}
function sendMessage(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
            const message = { action };
            chrome.tabs.sendMessage(tabId, message);
        }
    });
}
// ── Page 1 → Page 2 ────────────────────────────────────────
btnCreateWallet.addEventListener("click", () => {
    page2Subtitle.textContent = "Set up your brand-new wallet";
    showPage(page2);
    sendMessage("create_wallet");
});
btnHaveWallet.addEventListener("click", () => {
    page2Subtitle.textContent = "Restore or connect your existing wallet";
    showPage(page2);
    sendMessage("existing_wallet");
});
// ── Page 2 actions ─────────────────────────────────────────
btnEmail.addEventListener("click", () => {
    sendMessage("continue_email");
    // TODO: navigate to email flow
});
btnRecovery.addEventListener("click", () => {
    sendMessage("recovery_phrase");
    // TODO: navigate to recovery phrase flow
});
// ── Back button ────────────────────────────────────────────
btnBack.addEventListener("click", () => {
    showPage(page1);
});

/******/ })()
;
//# sourceMappingURL=popup.js.map