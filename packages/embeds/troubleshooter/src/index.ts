import { CalEmbedTroubleshooter } from "./troubleshooter";

(function () {
  "use strict";

  // Prevent multiple instances
  if (window.__calEmbedTroubleshooter) {
    console.warn("Cal Embed Troubleshooter is already initialized");
    return;
  }

  // Check if troubleshooter should be disabled
  if (window.__calEmbedTroubleshooterDisabled) {
    console.log("Cal Embed Troubleshooter is disabled");
    return;
  }

  window.__calEmbedTroubleshooter = new CalEmbedTroubleshooter();
})();
