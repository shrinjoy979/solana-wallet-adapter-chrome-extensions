// src/content.ts
chrome.runtime.onMessage.addListener(
  (
    message: { action: string },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): void => {
    if (message.action === "hello") {
      alert("Hello from TypeScript extension!");
    }
  }
);