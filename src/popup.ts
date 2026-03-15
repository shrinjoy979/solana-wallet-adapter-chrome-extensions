import * as bip39 from "bip39";

interface Message {
  action: string;
}

// ── Pages
const page1 = document.getElementById("page1") as HTMLDivElement;
const page2 = document.getElementById("page2") as HTMLDivElement;

// ── Page 1 buttons
const btnCreateWallet = document.getElementById("btnCreateWallet") as HTMLButtonElement;
const btnHaveWallet = document.getElementById("btnHaveWallet")   as HTMLButtonElement;

// ── Page 2 elements
const seedGrid = document.getElementById("seedGrid")    as HTMLDivElement;
const btnCopy = document.getElementById("btnCopy")     as HTMLButtonElement;
const btnContinue = document.getElementById("btnContinue") as HTMLButtonElement;
const btnBack = document.getElementById("btnBack")     as HTMLButtonElement;

// ── Helpers
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

function renderSeedPhrase(): string {
  const mnemonic = bip39.generateMnemonic();
  const words = mnemonic.split(" ");

  seedGrid.innerHTML = words
    .map((word, i) => `
      <div class="seed-word">
        <span class="seed-index">${i + 1}</span>
        <span class="seed-text">${word}</span>
      </div>`)
    .join("");

  return mnemonic;
}

// ── Page 1 → Page 2
let currentMnemonic = "";

btnCreateWallet.addEventListener("click", (): void => {
  try {
    currentMnemonic = renderSeedPhrase();
    showPage(page2);
  } catch (err) {
    console.error("Error during navigation:", err);
  }
});

btnHaveWallet.addEventListener("click", (): void => {
  currentMnemonic = renderSeedPhrase();
  showPage(page2);
  sendMessage("existing_wallet");
});

// ── Copy seed phrase
btnCopy.addEventListener("click", (): void => {
  navigator.clipboard.writeText(currentMnemonic).then(() => {
    btnCopy.textContent = "✅ Copied!";
    setTimeout(() => (btnCopy.textContent = "📋 Copy Phrase"), 2000);
  });
});

// ── Continue
btnContinue.addEventListener("click", (): void => {
  sendMessage("seed_confirmed");
  // TODO: go to next step (e.g. confirm seed phrase page)
});

// ── Back
btnBack.addEventListener("click", (): void => {
  showPage(page1);
});