import dynamic from "next/dynamic";

import { metadata as office365video } from "@calcom/office365video/_metadata";
import { metadata as zoomvideo } from "@calcom/zoomvideo/_metadata";

import { metadata as applecalendar } from "./applecalendar/_metadata";
import { metadata as caldavcalendar } from "./caldavcalendar/_metadata";
import { metadata as dailyvideo } from "./dailyvideo/_metadata";
import { metadata as giphy } from "./giphy/_metadata";
import { metadata as googlecalendar } from "./googlecalendar/_metadata";
import { metadata as googlevideo } from "./googlevideo/_metadata";
import { metadata as hubspotothercalendar } from "./hubspotothercalendar/_metadata";
import { metadata as huddle01video } from "./huddle01video/_metadata";
import { metadata as jitsivideo } from "./jitsivideo/_metadata";
import { metadata as metamask } from "./metamask/_metadata";
import { metadata as office365calendar } from "./office365calendar/_metadata";
import { metadata as slackmessaging } from "./slackmessaging/_metadata";
import { metadata as spacebooking } from "./spacebooking/_metadata";
import { metadata as stripepayment } from "./stripepayment/_metadata";
import { metadata as tandemvideo } from "./tandemvideo/_metadata";
import { metadata as vital } from "./vital/_metadata";
import { metadata as wipemycalother } from "./wipemycalother/_metadata";
import { metadata as zapier } from "./zapier/_metadata";

export const appStoreMetadata = {
  applecalendar,
  caldavcalendar,
  dailyvideo,
  googlecalendar,
  googlevideo,
  hubspotothercalendar,
  huddle01video,
  jitsivideo,
  office365calendar,
  office365video,
  slackmessaging,
  stripepayment,
  spacebooking,
  tandemvideo,
  vital,
  zoomvideo,
  wipemycalother,
  metamask,
  giphy,
  zapier,
};

export const apiHandlers = {
  // examplevideo: import("./_example/api"),
  applecalendar: import("./applecalendar/api"),
  caldavcalendar: import("./caldavcalendar/api"),
  googlecalendar: import("./googlecalendar/api"),
  hubspotothercalendar: import("./hubspotothercalendar/api"),
  office365calendar: import("./office365calendar/api"),
  slackmessaging: import("./slackmessaging/api"),
  stripepayment: import("./stripepayment/api"),
  tandemvideo: import("./tandemvideo/api"),
  vital: import("./vital/api"),
  zoomvideo: import("@calcom/zoomvideo/api"),
  office365video: import("@calcom/office365video/api"),
  wipemycalother: import("./wipemycalother/api"),
  jitsivideo: import("./jitsivideo/api"),
  huddle01video: import("./huddle01video/api"),
  metamask: import("./metamask/api"),
  giphy: import("./giphy/api"),
  spacebookingother: import("./spacebooking/api"),
  // @todo Until we use DB slugs everywhere
  zapierother: import("./zapier/api"),
};

export const InstallAppButtonMap = {
  // examplevideo: dynamic(() => import("./_example/components/InstallAppButton")),
  applecalendar: dynamic(() => import("./applecalendar/components/InstallAppButton")),
  caldavcalendar: dynamic(() => import("./caldavcalendar/components/InstallAppButton")),
  googlecalendar: dynamic(() => import("./googlecalendar/components/InstallAppButton")),
  hubspotothercalendar: dynamic(() => import("./hubspotothercalendar/components/InstallAppButton")),
  office365calendar: dynamic(() => import("./office365calendar/components/InstallAppButton")),
  slackmessaging: dynamic(() => import("./slackmessaging/components/InstallAppButton")),
  stripepayment: dynamic(() => import("./stripepayment/components/InstallAppButton")),
  tandemvideo: dynamic(() => import("./tandemvideo/components/InstallAppButton")),
  zoomvideo: dynamic(() => import("@calcom/zoomvideo/components/InstallAppButton")),
  office365video: dynamic(() => import("@calcom/office365video/components/InstallAppButton")),
  wipemycalother: dynamic(() => import("./wipemycalother/components/InstallAppButton")),
  zapier: dynamic(() => import("./zapier/components/InstallAppButton")),
  jitsivideo: dynamic(() => import("./jitsivideo/components/InstallAppButton")),
  huddle01video: dynamic(() => import("./huddle01video/components/InstallAppButton")),
  metamask: dynamic(() => import("./metamask/components/InstallAppButton")),
  giphy: dynamic(() => import("./giphy/components/InstallAppButton")),
  spacebookingother: dynamic(() => import("./spacebooking/components/InstallAppButton")),
  vital: dynamic(() => import("./vital/components/InstallAppButton")),
};
