export default defineBackground(() => {
  console.log('Background script loaded for Cal.com Companion v1.6.0');
  
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'icon-clicked' });
    }
  });
});