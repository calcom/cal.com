import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Tandem Video",
  description:
    "Tandem is a new virtual office space that allows teams to effortlessly connect as though they are in a physical office, online. Through co-working rooms, available statuses, live real-time video call, and chat options, you can see who's around, talk and collaborate in one click. It works cross-platform with both desktop and mobile versions.",
  type: "tandem_video",
  title: "Tandem Video",
  variant: "conferencing",
  categories: ["conferencing"],
  slug: "tandem",
  category: "conferencing",
  logo: "icon.svg",
  publisher: "",
  url: "",
  isGlobal: false,
  email: "help@cal.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:tandem",
      label: "Tandem Video",
    },
  },
  dirName: "tandemvideo",
  isOAuth: true,
} as AppMeta;

export default metadata;
