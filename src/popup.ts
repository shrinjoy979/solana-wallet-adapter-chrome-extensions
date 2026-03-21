import * as bip39 from "bip39";
import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  Keypair,
} from "@solana/web3.js";
import bs58 from "bs58";

const SOLANA_RPC =
  "https://solana-devnet.g.alchemy.com/v2/IR7u23Ytxfa-vBJZhy2fXkTnvxKGUPUa";
const connection = new Connection(SOLANA_RPC, "confirmed");

interface Message {
  action: string;
}

interface WalletData {
  name: string;
  address: string;
  encrypted: string; // encrypted private key / mnemonic
  iv: string; // initialisation vector for decryption
}

// ── Helper — get element safely

function getEl<T extends HTMLElement>(id: string): T | null {
  const el = document.getElementById(id) as T | null;
  if (!el) console.error(`❌ Element not found: #${id}`);
  return el;
}

// Pages
const page1 = getEl<HTMLDivElement>("page1");
const page2 = getEl<HTMLDivElement>("page2");
const page3 = getEl<HTMLDivElement>("page3");
const page4 = getEl<HTMLDivElement>("page4");
const page5 = getEl<HTMLDivElement>("page5");
const page6 = getEl<HTMLDivElement>("page6");
const page7 = getEl<HTMLDivElement>("page7");

// ── Page 1
const btnCreateWallet = getEl<HTMLButtonElement>("btnCreateWallet");
const btnHaveWallet = getEl<HTMLButtonElement>("btnHaveWallet");

// ── Page 2
const seedGrid = getEl<HTMLDivElement>("seedGrid");
const btnCopy = getEl<HTMLButtonElement>("btnCopy");
const btnContinue = getEl<HTMLButtonElement>("btnContinue");
const btnBack = getEl<HTMLButtonElement>("btnBack");

// ── Page 3
const btnImportPhrase = getEl<HTMLButtonElement>("btnImportPhrase");
const btnImportPrivateKey = getEl<HTMLButtonElement>("btnImportPrivateKey");
const btnBackPage3 = getEl<HTMLButtonElement>("btnBackPage3");

// ── Page 4
const recoveryGrid = getEl<HTMLDivElement>("recoveryGrid");
const btnConfirmRecovery = getEl<HTMLButtonElement>("btnConfirmRecovery");
const btnBackPage4 = getEl<HTMLButtonElement>("btnBackPage4");

// ── Page 5
const inputWalletName = getEl<HTMLInputElement>("inputWalletName");
const inputPrivateKey = getEl<HTMLInputElement>("inputPrivateKey");
const btnToggleKey = getEl<HTMLButtonElement>("btnToggleKey");
const btnConfirmPrivateKey = getEl<HTMLButtonElement>("btnConfirmPrivateKey");
const btnBackPage5 = getEl<HTMLButtonElement>("btnBackPage5");

// ── Page 6
const inputPassword = getEl<HTMLInputElement>("inputPassword");
const inputConfirmPassword = getEl<HTMLInputElement>("inputConfirmPassword");
const passwordError = getEl<HTMLParagraphElement>("passwordError");
const btnConfirmPassword = getEl<HTMLButtonElement>("btnConfirmPassword");
const btnBackPage6 = getEl<HTMLButtonElement>("btnBackPage6");

// ── Page 7
const dashWalletName = getEl<HTMLHeadingElement>("dashWalletName");
const dashAddress = getEl<HTMLSpanElement>("dashAddress");
const btnCopyAddress = getEl<HTMLButtonElement>("btnCopyAddress");
const balanceAmount = getEl<HTMLHeadingElement>("balanceAmount");
const btnSend = getEl<HTMLButtonElement>("btnSend");
const btnReceive = getEl<HTMLButtonElement>("btnReceive");

// ── State
let currentMnemonic = "";
let pendingWalletName = "";
let pendingSecret = ""; // mnemonic or private key — cleared after encryption

// ── Navigation
function showPage(pageEl: HTMLDivElement | null): void {
  if (!pageEl) {
    console.error("❌ showPage called with null");
    return;
  }
  [page1, page2, page3, page4, page5, page6, page7].forEach((p) =>
    p?.classList.remove("active"),
  );
  pageEl.classList.add("active");
}

function sendMessage(action: string): void {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId) chrome.tabs.sendMessage(tabId, { action } as Message);
  });
}

function on(btn: HTMLButtonElement | null, handler: () => void): void {
  if (!btn) return;
  btn.addEventListener("click", handler);
}

// ── Encryption helpers (Web Crypto API)
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer, // ← cast here
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptSecret(
  secret: string,
  password: string,
): Promise<{ encrypted: string; iv: string; salt: string }> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, // ← cast here
    key,
    enc.encode(secret).buffer as ArrayBuffer, // ← cast here
  );

  const toHex = (buf: Uint8Array) =>
    Array.from(buf)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return {
    encrypted: toHex(new Uint8Array(encrypted)),
    iv: toHex(iv),
    salt: toHex(salt),
  };
}

async function loadBalance(address: string): Promise<void> {
  if (!balanceAmount) return;

  balanceAmount.innerHTML = `… <span>SOL</span>`; // loading placeholder

  try {
    const pubkey = new PublicKey(address);
    const lamports = await connection.getBalance(pubkey);
    const sol = (lamports / 1e9).toFixed(4);

    balanceAmount.innerHTML = `${sol} <span>SOL</span>`;
  } catch (err) {
    console.error("❌ Failed to load balance:", err);
    balanceAmount.innerHTML = `— <span>SOL</span>`;
  }
}

function loadDashboard(wallet: WalletData): void {
  if (dashWalletName) dashWalletName.textContent = wallet.name;
  if (dashAddress) dashAddress.textContent = wallet.address;

  loadBalance(wallet.address);
  loadTransactions(wallet.address);
}

// ── Page 2 — Seed Phrase
function renderSeedPhrase(): string {
  const mnemonic = bip39.generateMnemonic();
  const words = mnemonic.split(" ");
  if (seedGrid) {
    seedGrid.innerHTML = words
      .map(
        (word, i) => `
        <div class="seed-word">
          <span class="seed-index">${i + 1}</span>
          <span class="seed-text">${word}</span>
        </div>`,
      )
      .join("");
  }
  return mnemonic;
}

// ── Page 4 — Recovery Inputs
function renderRecoveryInputs(): void {
  if (!recoveryGrid) return;
  recoveryGrid.innerHTML = Array.from(
    { length: 12 },
    (_, i) => `
    <div class="recovery-word">
      <span class="recovery-index">${i + 1}</span>
      <input class="recovery-input" id="word${i}" type="text"
        placeholder="word" autocomplete="off" spellcheck="false" />
    </div>`,
  ).join("");
}

function getEnteredMnemonic(): string {
  return Array.from({ length: 12 }, (_, i) => {
    const el = document.getElementById(`word${i}`) as HTMLInputElement | null;
    return el?.value.trim() ?? "";
  }).join(" ");
}

// ── Wire: Page 1
on(btnCreateWallet, () => {
  try {
    currentMnemonic = renderSeedPhrase();
    pendingSecret = currentMnemonic;
    pendingWalletName = "My Wallet";
    showPage(page2);
    sendMessage("create_wallet");
  } catch (err) {
    console.error("❌ renderSeedPhrase failed:", err);
  }
});

on(btnHaveWallet, () => showPage(page3));

// ── Wire: Page 2
on(btnCopy, () => {
  navigator.clipboard.writeText(currentMnemonic).then(() => {
    if (btnCopy) {
      btnCopy.textContent = "✅ Copied!";
      setTimeout(() => (btnCopy.textContent = "Copy Phrase"), 2000);
    }
  });
});

// After saving seed → go to set password
on(btnContinue, () => showPage(page6));
on(btnBack, () => showPage(page1));

// ── Wire: Page 3
on(btnImportPhrase, () => {
  renderRecoveryInputs();
  showPage(page4);
});
on(btnImportPrivateKey, () => showPage(page5));
on(btnBackPage3, () => showPage(page1));

// ── Wire: Page 4
on(btnConfirmRecovery, () => {
  const mnemonic = getEnteredMnemonic();
  if (mnemonic.split(" ").some((w) => w === "")) {
    alert("Please fill in all 12 words.");
    return;
  }
  if (!bip39.validateMnemonic(mnemonic)) {
    alert("❌ Invalid recovery phrase. Please check your words.");
    return;
  }
  pendingSecret = mnemonic;
  pendingWalletName = "Restored Wallet";
  showPage(page6); // → set password
});
on(btnBackPage4, () => showPage(page3));

// ── Wire: Page 5
on(btnToggleKey, () => {
  if (!inputPrivateKey || !btnToggleKey) return;
  const isHidden = inputPrivateKey.type === "password";
  inputPrivateKey.type = isHidden ? "text" : "password";
  btnToggleKey.textContent = isHidden ? "🙈 Hide" : "👁 Show";
});

on(btnConfirmPrivateKey, () => {
  const name = inputWalletName?.value.trim();
  const key = inputPrivateKey?.value.trim();
  if (!name) {
    alert("Please enter a wallet name.");
    return;
  }
  if (!key) {
    alert("Please enter your private key.");
    return;
  }
  pendingWalletName = name;
  pendingSecret = key;
  showPage(page6); // → set password
});
on(btnBackPage5, () => showPage(page3));

// ── Wire: Page 6
on(btnConfirmPassword, async () => {
  const pw = inputPassword?.value ?? "";
  const cpw = inputConfirmPassword?.value ?? "";

  if (pw.length < 8) {
    if (passwordError)
      passwordError.textContent = "Password must be at least 8 characters.";
    return;
  }
  if (pw !== cpw) {
    if (passwordError) passwordError.textContent = "Passwords do not match.";
    return;
  }
  if (passwordError) passwordError.textContent = "";

  await saveWalletAndOpenDashboard(pw);
});
on(btnBackPage6, () => showPage(page5));

// ── Wire: Page 7
on(btnCopyAddress, () => {
  const addr = dashAddress?.textContent ?? "";
  navigator.clipboard.writeText(addr).then(() => {
    if (btnCopyAddress) {
      btnCopyAddress.textContent = "✅";
      setTimeout(() => (btnCopyAddress.textContent = "📋"), 2000);
    }
  });
});

on(btnSend, () => sendMessage("send"));
on(btnReceive, () => sendMessage("receive"));

// ── On load — check if wallet already exists ───────────────
chrome.storage.local.get("wallet", (result) => {
  if (result.wallet) {
    loadDashboard(result.wallet as WalletData);
    showPage(page7); // skip setup if wallet already saved
  }
});

// ── Fetch & Display Transactions
async function loadTransactions(address: string): Promise<void> {
  const txSection = document.getElementById("txList");
  if (!txSection) return;

  txSection.innerHTML = `<p class="tx-empty">Loading transactions...</p>`;

  try {
    const pubkey = new PublicKey(address);

    // Fetch latest 10 transaction signatures
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 10,
    });

    if (signatures.length === 0) {
      txSection.innerHTML = `<p class="tx-empty">No transactions yet</p>`;
      return;
    }

    // Fetch full transaction details
    const txDetails = await connection.getParsedTransactions(
      signatures.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0 },
    );

    txSection.innerHTML = txDetails
      .map((tx, i) => renderTxRow(tx, signatures[i].signature, address))
      .join("");
  } catch (err) {
    console.error("❌ Failed to load transactions:", err);
    txSection.innerHTML = `<p class="tx-empty">Failed to load transactions</p>`;
  }
}

function renderTxRow(
  tx: ParsedTransactionWithMeta | null,
  signature: string,
  walletAddress: string,
): string {
  if (!tx || !tx.meta) {
    return `
      <div class="tx-row">
        <div class="tx-info">
          <span class="tx-type">Unknown</span>
          <span class="tx-sig">${truncate(signature)}</span>
        </div>
        <span class="tx-amount">—</span>
      </div>`;
  }

  // Calculate SOL change for this wallet
  const accountKeys = tx.transaction.message.accountKeys;
  const walletIndex = accountKeys.findIndex(
    (k) => k.pubkey.toString() === walletAddress,
  );
  const preBal = tx.meta.preBalances[walletIndex] ?? 0;
  const postBal = tx.meta.postBalances[walletIndex] ?? 0;
  const delta = (postBal - preBal) / 1e9; // lamports → SOL
  const isReceive = delta > 0;
  const amountStr = (delta > 0 ? "+" : "") + delta.toFixed(5) + " SOL";
  const date = tx.blockTime
    ? new Date(tx.blockTime * 1000).toLocaleDateString()
    : "Unknown date";
  const status = tx.meta.err ? "Failed" : isReceive ? "Received" : "Sent";

  return `
    <div class="tx-row" data-sig="${signature}">
      <div class="tx-icon ${isReceive ? "tx-in" : "tx-out"}">
        ${isReceive ? "↓" : "↑"}
      </div>
      <div class="tx-info">
        <span class="tx-type">${status}</span>
        <span class="tx-date">${date}</span>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${isReceive ? "amount-in" : "amount-out"}">${amountStr}</span>
        <span class="tx-sig">${truncate(signature)}</span>
      </div>
    </div>`;
}

function truncate(str: string, len = 8): string {
  return str.slice(0, len) + "..." + str.slice(-4);
}

// ── saveWalletAndOpenDashboard
async function saveWalletAndOpenDashboard(password: string): Promise<void> {
  const { encrypted, iv, salt } = await encryptSecret(pendingSecret, password);

  // ← derive real public key instead of truncating
  const address = derivePublicAddress(pendingSecret);

  const wallet: WalletData = {
    name: pendingWalletName,
    address, // ← full valid public key
    encrypted,
    iv: iv + ":" + salt,
  };

  chrome.storage.local.set({ wallet }, () => {
    console.log("✅ Wallet saved. Address:", address);
    pendingSecret = "";
    loadDashboard(wallet);
    showPage(page7);
  });
}

// ── Derive real Solana public key ──────────────────────────
function derivePublicAddress(secret: string): string {
  try {
    const words = secret.trim().split(" ");

    // Case 1: mnemonic (12 words)
    if (words.length === 12) {
      const seed = bip39.mnemonicToSeedSync(secret);
      const ab = seed.buffer.slice(seed.byteOffset, seed.byteOffset + 32);
      const seed32 = new Uint8Array(ab);
      const keypair = Keypair.fromSeed(seed32);
      return keypair.publicKey.toString();
    }

    const decoded = bs58.decode(secret);
    console.log("🔍 decoded length:", decoded.length);

    const keyBytes = new Uint8Array(
      decoded.buffer.slice(
        decoded.byteOffset,
        decoded.byteOffset + decoded.byteLength,
      ),
    );

    let keypair: Keypair;

    if (keyBytes.length === 32) {
      // 32 bytes = seed only → use fromSeed
      keypair = Keypair.fromSeed(keyBytes);
    } else if (keyBytes.length === 64) {
      // 64 bytes = full keypair → use fromSecretKey
      keypair = Keypair.fromSecretKey(keyBytes);
    } else {
      throw new Error(
        `Unexpected key length: ${keyBytes.length}. Expected 32 or 64 bytes.`,
      );
    }

    console.log("✅ Public key:", keypair.publicKey.toString());
    return keypair.publicKey.toString();
  } catch (err) {
    console.error("❌ Could not derive public key:", err);
    return "Invalid Key";
  }
}
// ```

// ---

// ## Complete Flow
// ```
// Page 1  Welcome
//  ├── Create New Wallet
//  │    └── Page 2 (seed phrase) → Page 6 (set password) → Page 7 (dashboard)
//  └── Already Have Wallet
//       └── Page 3 (restore options)
//            ├── Import Recovery Phrase → Page 4 → Page 6 → Page 7
//            └── Import Private Key    → Page 5 → Page 6 → Page 7
