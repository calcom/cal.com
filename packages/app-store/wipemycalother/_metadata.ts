import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "WipeMyCal",
  description:
    "Wipe My Cal is a Cal.com exclusive app that redefines what it looks like to reschedule multiple meetings at the same time. Simply install the app, and select 'Wipe' for whatever date you need to mass reschedule. Handle emergencies, unexpected sick days and last minute events with the simple click of a button.",
  installed: true,
  category: "automation",
  categories: ["automation"],
  // If using static next public folder, can then be referenced from the base URL (/).
  logo: "icon-dark.svg",
  publisher: "Cal.com",
  slug: "wipe-my-cal",
  title: "Wipe my cal",
  type: "wipemycal_other",
  url: "https://cal.com/apps/wipe-my-cal",
  variant: "other",
  email: "help@cal.com",
  dirName: "wipemycalother",
  isOAuth: false,
} as AppMeta;

export default metadata;
