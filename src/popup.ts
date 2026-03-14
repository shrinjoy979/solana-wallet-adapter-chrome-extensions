// src/popup.ts
interface Message {
  action: string;
}

// ── Page elements ──────────────────────────────────────────
const page1 = document.getElementById("page1") as HTMLDivElement;
const page2 = document.getElementById("page2") as HTMLDivElement;
const page2Subtitle = document.getElementById("page2Subtitle") as HTMLParagraphElement;

// ── Page 1 buttons ─────────────────────────────────────────
const btnCreateWallet = document.getElementById("btnCreateWallet") as HTMLButtonElement;
const btnHaveWallet   = document.getElementById("btnHaveWallet")   as HTMLButtonElement;

// ── Page 2 buttons ─────────────────────────────────────────
const btnEmail    = document.getElementById("btnEmail")    as HTMLButtonElement;
const btnRecovery = document.getElementById("btnRecovery") as HTMLButtonElement;
const btnBack     = document.getElementById("btnBack")     as HTMLButtonElement;

// ── Navigation helpers ─────────────────────────────────────
function showPage(pageEl: HTMLDivElement): void {
  [page1, page2].forEach(p => p.classList.remove("active"));
  pageEl.classList.add("active");
}

function sendMessage(action: string): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]): void => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      const message: Message = { action };
      chrome.tabs.sendMessage(tabId, message);
    }
  });
}

// ── Page 1 → Page 2 ────────────────────────────────────────
btnCreateWallet.addEventListener("click", (): void => {
  page2Subtitle.textContent = "Set up your brand-new wallet";
  showPage(page2);
  sendMessage("create_wallet");
});

btnHaveWallet.addEventListener("click", (): void => {
  page2Subtitle.textContent = "Restore or connect your existing wallet";
  showPage(page2);
  sendMessage("existing_wallet");
});

// ── Page 2 actions ─────────────────────────────────────────
btnEmail.addEventListener("click", (): void => {
  sendMessage("continue_email");
  // TODO: navigate to email flow
});

btnRecovery.addEventListener("click", (): void => {
  sendMessage("recovery_phrase");
  // TODO: navigate to recovery phrase flow
});

// ── Back button ────────────────────────────────────────────
btnBack.addEventListener("click", (): void => {
  showPage(page1);
});