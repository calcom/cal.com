export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Cal.com Companion content script loaded');
  },
});

function defineContentScript(config: { matches: string[], main: () => void }) {
  return config;
}