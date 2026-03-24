import * as bip39 from "bip39";
import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import bs58 from "bs58";
import QRCode from "qrcode";

// ── Solana Connection ──────────────────────────────────────
const SOLANA_RPC =
  "https://solana-devnet.g.alchemy.com/v2/IR7u23Ytxfa-vBJZhy2fXkTnvxKGUPUa";
const connection = new Connection(SOLANA_RPC, "confirmed");

// ── Interfaces ─────────────────────────────────────────────
interface Message {
  action: string;
}

interface WalletData {
  name: string;
  address: string;
  encrypted: string;
  iv: string;
}

// ── Helper — get element safely ────────────────────────────
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
const page5 = getEl<HTMLDivElement>("page5");
const page6 = getEl<HTMLDivElement>("page6");
const page7 = getEl<HTMLDivElement>("page7");
const page8 = getEl<HTMLDivElement>("page8");
const page9 = getEl<HTMLDivElement>("page9");

// ── Page 1 ─────────────────────────────────────────────────
const btnCreateWallet = getEl<HTMLButtonElement>("btnCreateWallet");
const btnHaveWallet = getEl<HTMLButtonElement>("btnHaveWallet");

// ── Page 2 ─────────────────────────────────────────────────
const seedGrid = getEl<HTMLDivElement>("seedGrid");
const btnCopy = getEl<HTMLButtonElement>("btnCopy");
const btnContinue = getEl<HTMLButtonElement>("btnContinue");
const btnBack = getEl<HTMLButtonElement>("btnBack");

// ── Page 3 ─────────────────────────────────────────────────
const btnImportPhrase = getEl<HTMLButtonElement>("btnImportPhrase");
const btnImportPrivateKey = getEl<HTMLButtonElement>("btnImportPrivateKey");
const btnBackPage3 = getEl<HTMLButtonElement>("btnBackPage3");

// ── Page 4 ─────────────────────────────────────────────────
const recoveryGrid = getEl<HTMLDivElement>("recoveryGrid");
const btnConfirmRecovery = getEl<HTMLButtonElement>("btnConfirmRecovery");
const btnBackPage4 = getEl<HTMLButtonElement>("btnBackPage4");

// ── Page 5 ─────────────────────────────────────────────────
const inputWalletName = getEl<HTMLInputElement>("inputWalletName");
const inputPrivateKey = getEl<HTMLInputElement>("inputPrivateKey");
const btnToggleKey = getEl<HTMLButtonElement>("btnToggleKey");
const btnConfirmPrivateKey = getEl<HTMLButtonElement>("btnConfirmPrivateKey");
const btnBackPage5 = getEl<HTMLButtonElement>("btnBackPage5");

// ── Page 6 ─────────────────────────────────────────────────
const inputPassword = getEl<HTMLInputElement>("inputPassword");
const inputConfirmPassword = getEl<HTMLInputElement>("inputConfirmPassword");
const passwordError = getEl<HTMLParagraphElement>("passwordError");
const btnConfirmPassword = getEl<HTMLButtonElement>("btnConfirmPassword");
const btnBackPage6 = getEl<HTMLButtonElement>("btnBackPage6");

// ── Page 7 ─────────────────────────────────────────────────
const dashWalletName = getEl<HTMLHeadingElement>("dashWalletName");
const dashAddress = getEl<HTMLSpanElement>("dashAddress");
const btnCopyAddress = getEl<HTMLButtonElement>("btnCopyAddress");
const balanceAmount = getEl<HTMLHeadingElement>("balanceAmount");
const btnSend = getEl<HTMLButtonElement>("btnSend");
const btnReceive = getEl<HTMLButtonElement>("btnReceive");

// ── Page 8 ─────────────────────────────────────────────────
const inputRecipient = getEl<HTMLTextAreaElement>("inputRecipient");
const inputAmount = getEl<HTMLInputElement>("inputAmount");
const btnPasteAddress = getEl<HTMLButtonElement>("btnPasteAddress");
const btnMaxAmount = getEl<HTMLButtonElement>("btnMaxAmount");
const btnConfirmSend = getEl<HTMLButtonElement>("btnConfirmSend");
const btnBackPage8 = getEl<HTMLButtonElement>("btnBackPage8");
const sendAvailableBalance = getEl<HTMLSpanElement>("sendAvailableBalance");
const sendError = getEl<HTMLParagraphElement>("sendError");

// ── Page 9 elements ────────────────────────────────────────
const receiveAddress = getEl<HTMLParagraphElement>("receiveAddress");
const btnCopyReceiveAddress = getEl<HTMLButtonElement>("btnCopyReceiveAddress");
const btnCloseReceive = getEl<HTMLButtonElement>("btnCloseReceive");
const btnBackPage9 = getEl<HTMLButtonElement>("btnBackPage9");

// ── State ──────────────────────────────────────────────────
let currentMnemonic = "";
let pendingWalletName = "";
let pendingSecret = "";
let currentBalance = 0;

// ── Navigation ─────────────────────────────────────────────
function showPage(pageEl: HTMLDivElement | null): void {
  if (!pageEl) {
    console.error("❌ showPage called with null");
    return;
  }
  [page1, page2, page3, page4, page5, page6, page7, page8, page9].forEach((p) =>
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

// ── Encryption helpers (Web Crypto API) ────────────────────
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
      salt: salt.buffer as ArrayBuffer,
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
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    enc.encode(secret).buffer as ArrayBuffer,
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

async function decryptSecret(
  wallet: WalletData,
  password: string,
): Promise<string> {
  const [ivHex, saltHex] = wallet.iv.split(":");
  const fromHex = (hex: string) =>
    new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

  const iv = fromHex(ivHex);
  const salt = fromHex(saltHex);
  const key = await deriveKey(password, salt);

  const encryptedBytes = fromHex(wallet.encrypted);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    encryptedBytes.buffer as ArrayBuffer,
  );
  return new TextDecoder().decode(decrypted);
}

// ── Derive public key from secret ─────────────────────────
function derivePublicAddress(secret: string): string {
  try {
    const words = secret.trim().split(" ");

    if (words.length === 12) {
      const seed = bip39.mnemonicToSeedSync(secret);
      const ab = seed.buffer.slice(seed.byteOffset, seed.byteOffset + 32);
      const seed32 = new Uint8Array(ab);
      const keypair = Keypair.fromSeed(seed32);
      return keypair.publicKey.toString();
    }

    const decoded = bs58.decode(secret);
    const keyBytes = new Uint8Array(
      decoded.buffer.slice(
        decoded.byteOffset,
        decoded.byteOffset + decoded.byteLength,
      ),
    );

    let keypair: Keypair;
    if (keyBytes.length === 32) {
      keypair = Keypair.fromSeed(keyBytes);
    } else if (keyBytes.length === 64) {
      keypair = Keypair.fromSecretKey(keyBytes);
    } else {
      throw new Error(`Unexpected key length: ${keyBytes.length}`);
    }

    return keypair.publicKey.toString();
  } catch (err) {
    console.error("❌ Could not derive public key:", err);
    return "Invalid Key";
  }
}

// ── Save wallet & open dashboard ──────────────────────────
async function saveWalletAndOpenDashboard(password: string): Promise<void> {
  const { encrypted, iv, salt } = await encryptSecret(pendingSecret, password);
  const address = derivePublicAddress(pendingSecret);

  const wallet: WalletData = {
    name: pendingWalletName,
    address,
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

// ── Load balance ───────────────────────────────────────────
async function loadBalance(address: string): Promise<void> {
  if (!balanceAmount) return;
  balanceAmount.innerHTML = `… <span>SOL</span>`;
  try {
    const pubkey = new PublicKey(address);
    const lamports = await connection.getBalance(pubkey);
    currentBalance = lamports / LAMPORTS_PER_SOL;
    balanceAmount.innerHTML = `${currentBalance.toFixed(4)} <span>SOL</span>`;
  } catch (err) {
    console.error("❌ Failed to load balance:", err);
    balanceAmount.innerHTML = `— <span>SOL</span>`;
  }
}

// ── Load dashboard ─────────────────────────────────────────
function loadDashboard(wallet: WalletData): void {
  if (dashWalletName) dashWalletName.textContent = wallet.name;
  if (dashAddress) dashAddress.textContent = wallet.address;
  loadBalance(wallet.address);
  loadTransactions(wallet.address);
}

// ── Load transactions ──────────────────────────────────────
async function loadTransactions(address: string): Promise<void> {
  const txSection = document.getElementById("txList");
  if (!txSection) return;

  txSection.innerHTML = `<p class="tx-empty">Loading transactions...</p>`;

  try {
    const pubkey = new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 10,
    });

    if (signatures.length === 0) {
      txSection.innerHTML = `<p class="tx-empty">No transactions yet</p>`;
      return;
    }

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

  const accountKeys = tx.transaction.message.accountKeys;
  const walletIndex = accountKeys.findIndex(
    (k) => k.pubkey.toString() === walletAddress,
  );
  const preBal = tx.meta.preBalances[walletIndex] ?? 0;
  const postBal = tx.meta.postBalances[walletIndex] ?? 0;
  const delta = (postBal - preBal) / 1e9;
  const isReceive = delta > 0;
  const amountStr = (delta > 0 ? "+" : "") + delta.toFixed(5) + " SOL";
  const date = tx.blockTime
    ? new Date(tx.blockTime * 1000).toLocaleDateString()
    : "Unknown date";
  const status = tx.meta.err ? "Failed" : isReceive ? "Received" : "Sent";

  const arrowIcon = isReceive
    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`
    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;

  return `
    <div class="tx-row" data-sig="${signature}">
      <div class="tx-icon ${isReceive ? "tx-in" : "tx-out"}">
        ${arrowIcon}
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

async function pollConfirmation(
  signature: string,
  maxRetries = 30,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await connection.getSignatureStatus(signature);
    const status = result?.value;

    if (status?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    }

    if (
      status?.confirmationStatus === "confirmed" ||
      status?.confirmationStatus === "finalized"
    ) {
      return;
    }

    // Wait 1 second before retrying
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error("Transaction confirmation timed out after 30 seconds.");
}

// ── Send SOL ───────────────────────────────────────────────
async function sendSol(
  secretBytes: Uint8Array,
  toAddress: string,
  amountSol: number,
): Promise<string> {
  const fromKeypair =
    secretBytes.length === 32
      ? Keypair.fromSeed(secretBytes)
      : Keypair.fromSecretKey(secretBytes);

  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromKeypair.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey,
      lamports,
    }),
  );

  transaction.sign(fromKeypair);

  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: false },
  );

  // ← poll instead of confirmTransaction (no WebSocket needed)
  await pollConfirmation(signature);

  return signature;
}

// ── Page 2 — Render seed phrase ────────────────────────────
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

// ── Page 4 — Render recovery inputs ───────────────────────
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

// ══════════════════════════════════════════════════════════
//  WIRE UP BUTTONS
// ══════════════════════════════════════════════════════════

// ── Page 1 ─────────────────────────────────────────────────
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

// ── Page 2 ─────────────────────────────────────────────────
on(btnCopy, () => {
  navigator.clipboard.writeText(currentMnemonic).then(() => {
    if (btnCopy) {
      btnCopy.textContent = "Copied!";
      setTimeout(() => (btnCopy.textContent = "Copy Phrase"), 2000);
    }
  });
});

on(btnContinue, () => showPage(page6));
on(btnBack, () => showPage(page1));

// ── Page 3 ─────────────────────────────────────────────────
on(btnImportPhrase, () => {
  renderRecoveryInputs();
  showPage(page4);
});
on(btnImportPrivateKey, () => showPage(page5));
on(btnBackPage3, () => showPage(page1));

// ── Page 4 ─────────────────────────────────────────────────
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
  showPage(page6);
});
on(btnBackPage4, () => showPage(page3));

// ── Page 5 ─────────────────────────────────────────────────
on(btnToggleKey, () => {
  if (!inputPrivateKey || !btnToggleKey) return;
  const isHidden = inputPrivateKey.type === "password";
  inputPrivateKey.type = isHidden ? "text" : "password";
  btnToggleKey.textContent = isHidden ? "Hide" : "Show";
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
  showPage(page6);
});
on(btnBackPage5, () => showPage(page3));

// ── Page 6 ─────────────────────────────────────────────────
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

// ── Page 7 ─────────────────────────────────────────────────
on(btnCopyAddress, () => {
  const addr = dashAddress?.textContent ?? "";
  const iconCopy = document.getElementById("iconCopy");
  const iconCheck = document.getElementById("iconCheck");
  navigator.clipboard.writeText(addr).then(() => {
    if (iconCopy) iconCopy.style.display = "none";
    if (iconCheck) iconCheck.style.display = "block";
    setTimeout(() => {
      if (iconCopy) iconCopy.style.display = "block";
      if (iconCheck) iconCheck.style.display = "none";
    }, 2000);
  });
});

on(btnSend, () => {
  if (sendAvailableBalance)
    sendAvailableBalance.textContent = currentBalance.toFixed(4);
  if (inputRecipient) inputRecipient.value = "";
  if (inputAmount) inputAmount.value = "";
  if (sendError) sendError.textContent = "";
  showPage(page8);
});

on(btnReceive, () => {
  chrome.storage.local.get("wallet", async (result) => {
    if (!result.wallet) return;
    const wallet = result.wallet as WalletData;
    const address = wallet.address;

    if (receiveAddress) receiveAddress.textContent = address;
    await renderQRCode(address);
    showPage(page9);
  });
});

// ── Page 8 ─────────────────────────────────────────────────
on(btnPasteAddress, async () => {
  const text = await navigator.clipboard.readText();
  if (inputRecipient) inputRecipient.value = text;
});

on(btnMaxAmount, () => {
  const max = Math.max(0, currentBalance - 0.000005);
  if (inputAmount) inputAmount.value = max.toFixed(6);
});

on(btnConfirmSend, async () => {
  if (sendError) sendError.textContent = "";

  const recipient = inputRecipient?.value.trim() ?? "";
  const amount = parseFloat(inputAmount?.value ?? "0");

  if (!recipient) {
    if (sendError) sendError.textContent = "Please enter a recipient address.";
    return;
  }
  try {
    new PublicKey(recipient);
  } catch {
    if (sendError) sendError.textContent = "Invalid Solana address.";
    return;
  }
  if (!amount || amount <= 0) {
    if (sendError) sendError.textContent = "Please enter a valid amount.";
    return;
  }
  if (amount > currentBalance) {
    if (sendError) sendError.textContent = "Insufficient balance.";
    return;
  }

  const password = prompt("Enter your wallet password to confirm:");
  if (!password) return;

  if (btnConfirmSend) {
    btnConfirmSend.textContent = "Sending...";
    btnConfirmSend.setAttribute("disabled", "true");
  }

  try {
    chrome.storage.local.get("wallet", async (result) => {
      const wallet = result.wallet as WalletData;
      const secret = await decryptSecret(wallet, password);

      let secretBytes: Uint8Array;
      if (secret.trim().split(" ").length === 12) {
        const seed = bip39.mnemonicToSeedSync(secret);
        secretBytes = new Uint8Array(
          seed.buffer.slice(seed.byteOffset, seed.byteOffset + 32),
        );
      } else {
        const decoded = bs58.decode(secret);
        secretBytes = new Uint8Array(
          decoded.buffer.slice(
            decoded.byteOffset,
            decoded.byteOffset + decoded.byteLength,
          ),
        );
      }

      const signature = await sendSol(secretBytes, recipient, amount);
      console.log("✅ TX sent:", signature);

      if (btnConfirmSend) {
        btnConfirmSend.textContent = "Sent! ✅";
        setTimeout(() => {
          if (btnConfirmSend) {
            btnConfirmSend.textContent = "Send";
            btnConfirmSend.removeAttribute("disabled");
          }
          showPage(page7);
          chrome.storage.local.get("wallet", (r) => {
            if (r.wallet) loadDashboard(r.wallet as WalletData);
          });
        }, 2000);
      }
    });
  } catch (err: any) {
    console.error("❌ Send failed:", err);
    if (sendError) sendError.textContent = err.message ?? "Transaction failed.";
    if (btnConfirmSend) {
      btnConfirmSend.textContent = "Send";
      btnConfirmSend.removeAttribute("disabled");
    }
  }
});

on(btnBackPage8, () => showPage(page7));

// ── On load — check if wallet already exists ───────────────
chrome.storage.local.get("wallet", (result) => {
  if (result.wallet) {
    loadDashboard(result.wallet as WalletData);
    showPage(page7);
  }
});

// ── Render QR code ─────────────────────────────────────────
async function renderQRCode(address: string): Promise<void> {
  const qrContainer = document.getElementById("qrCode");
  if (!qrContainer) return;

  qrContainer.innerHTML = "";

  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, address, {
    width: 160,
    margin: 1,
    color: {
      dark: "#ffffff",
      light: "#1e1e30",
    },
  });
  qrContainer.appendChild(canvas);
}

// ── Wire: Page 9 ───────────────────────────────────────────
on(btnCopyReceiveAddress, () => {
  const addr = receiveAddress?.textContent ?? "";
  navigator.clipboard.writeText(addr).then(() => {
    if (btnCopyReceiveAddress) {
      btnCopyReceiveAddress.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Copied!`;
      setTimeout(() => {
        if (btnCopyReceiveAddress) {
          btnCopyReceiveAddress.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy Address`;
        }
      }, 2000);
    }
  });
});

on(btnCloseReceive, () => showPage(page7));
on(btnBackPage9, () => showPage(page7));
