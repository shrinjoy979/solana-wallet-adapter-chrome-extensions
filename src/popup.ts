import * as bip39 from "bip39";

interface Message {
  action: string;
}

// ── Helper to safely get elements ─────────────────────────
function getEl<T extends HTMLElement>(id: string): T | null {
  const el = document.getElementById(id) as T | null;
  if (!el) console.error(`❌ Element not found: #${id}`);
  return el;
}

// ── Pages ──────────────────────────────────────────────────
const page1 = getEl<HTMLDivElement>("page1");
const page2 = getEl<HTMLDivElement>("page2");
const page3 = getEl<HTMLDivElement>("page3");
const page4 = getEl<HTMLDivElement>("page4");

// ── Page 1 buttons ─────────────────────────────────────────
const btnCreateWallet = getEl<HTMLButtonElement>("btnCreateWallet");
const btnHaveWallet   = getEl<HTMLButtonElement>("btnHaveWallet");

// ── Page 2 elements ────────────────────────────────────────
const seedGrid    = getEl<HTMLDivElement>("seedGrid");
const btnCopy     = getEl<HTMLButtonElement>("btnCopy");
const btnContinue = getEl<HTMLButtonElement>("btnContinue");
const btnBack     = getEl<HTMLButtonElement>("btnBack");

// ── Page 3 buttons ─────────────────────────────────────────
const btnImportPhrase = getEl<HTMLButtonElement>("btnImportPhrase");
const btnImportPrivateKey  = getEl<HTMLButtonElement>("btnImportPrivateKey");
const btnBackPage3    = getEl<HTMLButtonElement>("btnBackPage3");

// ── Page 4 elements ────────────────────────────────────────
const recoveryGrid       = getEl<HTMLDivElement>("recoveryGrid");
const btnConfirmRecovery = getEl<HTMLButtonElement>("btnConfirmRecovery");
const btnBackPage4       = getEl<HTMLButtonElement>("btnBackPage4");

// ── Helpers ────────────────────────────────────────────────
function showPage(pageEl: HTMLDivElement | null): void {
  if (!pageEl) { console.error("❌ showPage called with null"); return; }
  [page1, page2, page3, page4].forEach(p => p?.classList.remove("active"));
  pageEl.classList.add("active");
}

function sendMessage(action: string): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) chrome.tabs.sendMessage(tabId, { action } as Message);
  });
}

function on(btn: HTMLButtonElement | null, handler: () => void): void {
  if (!btn) return; // ← skip silently if element missing
  btn.addEventListener("click", handler);
}

// ── Page 2 — Generate Seed Phrase ─────────────────────────
let currentMnemonic = "";

function renderSeedPhrase(): string {
  const mnemonic = bip39.generateMnemonic();
  const words = mnemonic.split(" ");
  if (seedGrid) {
    seedGrid.innerHTML = words
      .map((word, i) => `
        <div class="seed-word">
          <span class="seed-index">${i + 1}</span>
          <span class="seed-text">${word}</span>
        </div>`)
      .join("");
  }
  return mnemonic;
}

// ── Page 4 — Recovery Inputs ───────────────────────────────
function renderRecoveryInputs(): void {
  if (!recoveryGrid) return;
  recoveryGrid.innerHTML = Array.from({ length: 12 }, (_, i) => `
    <div class="recovery-word">
      <span class="recovery-index">${i + 1}</span>
      <input
        class="recovery-input"
        id="word${i}"
        type="text"
        placeholder="word"
        autocomplete="off"
        spellcheck="false"
      />
    </div>`).join("");
}

function getEnteredMnemonic(): string {
  return Array.from({ length: 12 }, (_, i) => {
    const el = document.getElementById(`word${i}`) as HTMLInputElement | null;
    return el?.value.trim() ?? "";
  }).join(" ");
}

// ── Wire up buttons ────────────────────────────────────────

// Page 1
on(btnCreateWallet, () => {
  try {
    currentMnemonic = renderSeedPhrase();
    showPage(page2);
    sendMessage("create_wallet");
  } catch (err) {
    console.error("❌ renderSeedPhrase failed:", err);
  }
});

on(btnHaveWallet, () => showPage(page3));

// Page 2
on(btnCopy, () => {
  navigator.clipboard.writeText(currentMnemonic).then(() => {
    if (btnCopy) {
      btnCopy.textContent = "✅ Copied!";
      setTimeout(() => (btnCopy.textContent = "Copy Phrase"), 2000);
    }
  });
});
on(btnContinue, () => sendMessage("seed_confirmed"));
on(btnBack,     () => showPage(page1));

// Page 3
on(btnImportPhrase, () => {
  renderRecoveryInputs();
  showPage(page4);
});
on(btnImportPrivateKey, () => sendMessage("import_email"));
on(btnBackPage3,   () => showPage(page1));

// Page 4
on(btnConfirmRecovery, () => {
  const mnemonic = getEnteredMnemonic();
  const words = mnemonic.split(" ");
  if (words.some(w => w === "")) {
    alert("Please fill in all 12 words.");
    return;
  }
  if (!bip39.validateMnemonic(mnemonic)) {
    alert("❌ Invalid recovery phrase. Please check your words.");
    return;
  }
  console.log("✅ Valid mnemonic:", mnemonic);
  sendMessage("wallet_restored");
});
on(btnBackPage4, () => showPage(page3));