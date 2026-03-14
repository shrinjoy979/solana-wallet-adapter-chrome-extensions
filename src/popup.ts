// src/popup.ts
interface Message {
  action: string;
}

const btn = document.getElementById("myBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLParagraphElement;

btn.addEventListener("click", (): void => {
  statusEl.textContent = "Button clicked!";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]): void => {
    const tabId = tabs[0]?.id;
    if (tabId) {
      const message: Message = { action: "hello" };
      chrome.tabs.sendMessage(tabId, message);
    }
  });
});