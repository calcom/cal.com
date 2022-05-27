const fs = require("fs");
const appDirs = [];
fs.readdirSync(`${__dirname}`).forEach(function (dir) {
  if (fs.statSync(`${__dirname}/${dir}`).isDirectory()) {
    if (dir.startsWith("_")) {
      return;
    }
    appDirs.push(dir);
  }
});

let output = [`import dynamic from "next/dynamic"`];

function forEachAppDir(callback) {
  for (let i = 0; i < appDirs.length; i++) {
    callback(appDirs[i]);
  }
}

forEachAppDir((dirName) => {
  output.push(`import { metadata as ${dirName} } from "./${dirName}/_metadata";`);
});
output.push(`export const appStoreMetadata = {`);
forEachAppDir((dirName) => {
  output.push(`${dirName},`);
});
output.push(`};`);

// export const apiHandlers = {
//   // examplevideo: import("./_example/api"),
//   applecalendar: import("./applecalendar/api"),
//   caldavcalendar: import("./caldavcalendar/api"),
//   googlecalendar: import("./googlecalendar/api"),
//   hubspotothercalendar: import("./hubspotothercalendar/api"),
//   office365calendar: import("./office365calendar/api"),
//   slackmessaging: import("./slackmessaging/api"),
//   stripepayment: import("./stripepayment/api"),
//   tandemvideo: import("./tandemvideo/api"),
//   vital: import("./vital/api"),
//   zoomvideo: import("@calcom/zoomvideo/api"),
//   office365video: import("@calcom/office365video/api"),
//   wipemycalother: import("./wipemycalother/api"),
//   jitsivideo: import("./jitsivideo/api"),
//   huddle01video: import("./huddle01video/api"),
//   metamask: import("./metamask/api"),
//   giphy: import("./giphy/api"),
//   spacebookingother: import("./spacebooking/api"),
//   // @todo Until we use DB slugs everywhere
//   zapierother: import("./zapier/api"),
// };

// export const InstallAppButtonMap = {
//   // examplevideo: dynamic(() => import("./_example/components/InstallAppButton")),
//   applecalendar: dynamic(() => import("./applecalendar/components/InstallAppButton")),
//   caldavcalendar: dynamic(() => import("./caldavcalendar/components/InstallAppButton")),
//   googlecalendar: dynamic(() => import("./googlecalendar/components/InstallAppButton")),
//   hubspotothercalendar: dynamic(() => import("./hubspotothercalendar/components/InstallAppButton")),
//   office365calendar: dynamic(() => import("./office365calendar/components/InstallAppButton")),
//   slackmessaging: dynamic(() => import("./slackmessaging/components/InstallAppButton")),
//   stripepayment: dynamic(() => import("./stripepayment/components/InstallAppButton")),
//   tandemvideo: dynamic(() => import("./tandemvideo/components/InstallAppButton")),
//   zoomvideo: dynamic(() => import("./zoomvideo/components/InstallAppButton")),
//   office365video: dynamic(() => import("./office365video/components/InstallAppButton")),
//   wipemycalother: dynamic(() => import("./wipemycalother/components/InstallAppButton")),
//   zapier: dynamic(() => import("./zapier/components/InstallAppButton")),
//   jitsivideo: dynamic(() => import("./jitsivideo/components/InstallAppButton")),
//   huddle01video: dynamic(() => import("./huddle01video/components/InstallAppButton")),
//   metamask: dynamic(() => import("./metamask/components/InstallAppButton")),
//   giphy: dynamic(() => import("./giphy/components/InstallAppButton")),
//   spacebookingother: dynamic(() => import("./spacebooking/components/InstallAppButton")),
//   vital: dynamic(() => import("./vital/components/InstallAppButton")),
// };

fs.writeFileSync(`${__dirname}/apps.generated.tsx`, output.join("\n"));
