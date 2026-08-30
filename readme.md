https://github.com/user-attachments/assets/2e2758fe-faef-4097-adf6-4d25bea30c3d

https://github.com/user-attachments/assets/a2913256-d93f-4a93-a2fe-027703761d2c

## Links

- **Web App GitHub Repository:**  
  <a href="https://github.com/shrinjoy979/SOLi" target="_blank">Open Repository</a>

- **Web App Live Link:**  
  <a href="https://sol-i.vercel.app/" target="_blank">https://sol-i.vercel.app/</a>

# SOLi – Solana Wallet Extension

SOLi is a modern Web3 wallet extension built on the Solana blockchain.

It provides essential wallet and token utilities in a clean UI.

---

## Features

- Import wallet using a private key  
- Import wallet using a seed phrase (mnemonic)  
- Generate a new seed phrase  
- Generate public & private keys  
- Send SOL  
- Receive SOL  
- View wallet transactions

---

## Tech Stack

- TypeScript
- Solana Web3.js  
- Solana Wallet Adapter  

---

## Setup Project

### 1. Clone the repository

```bash
git clone https://github.com/your-username/soli-wallet-extension.git
cd soli-wallet-extension

---

## Project Structure
solana-wallet-adapter-chrome-extensions/
├── public/ Static assets and extension manifest resources
├── src/ Source code (wallet logic, UI components)
├── manifest.json Chrome extension manifest configuration
├── package.json Project dependencies and scripts
├── tsconfig.json TypeScript configuration
├── webpack.config.js Webpack bundler configuration
└── .gitignore


---

## Setup Project

### 1. Clone the repository

git clone https://github.com/shrinjoy979/solana-wallet-adapter-chrome-extensions.git
cd solana-wallet-adapter-chrome-extensions


### 2. Install dependencies

npm install


### 3. Build the extension

npm run build


### 4. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `dist` (build output) folder
4. The SOLi wallet extension icon will appear in your Chrome toolbar

---

## Usage

1. Click the SOLi icon in the Chrome toolbar
2. Create a new wallet or import an existing one using a private key or seed phrase
3. Use the interface to send SOL, receive SOL, and view transaction history

---

## Disclaimer

This extension handles private keys and seed phrases. Use only on trusted devices and never share your private key or seed phrase with anyone. This project is provided as-is for educational and development purposes.

---

## Contributing

Contributions are welcome. Feel free to open an issue or submit a pull request.

## License

Specify your license here (e.g., MIT).
