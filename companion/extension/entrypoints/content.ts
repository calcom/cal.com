export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
  },
});

function defineContentScript(config: { matches: string[], main: () => void }) {
  return config;
}