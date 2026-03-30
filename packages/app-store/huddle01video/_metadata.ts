import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Huddle01",
  description:
    "Huddle01 is a new video conferencing software native to Web3 and is comparable to a decentralized version of Zoom. It supports conversations for NFT communities, DAOs, Builders and also has features such as token gating, NFTs as avatars, Web3 Login + ENS and recording over IPFS.",
  installed: true,
  type: "huddle01_video",
  variant: "conferencing",
  categories: ["video", "conferencing"],
  logo: "icon.svg",
  publisher: "huddle01.com",
  url: "https://huddle01.com",
  category: "conferencing",
  slug: "huddle01",
  title: "Huddle01",
  isGlobal: false,
  email: "support@huddle01.com",
  appData: {
    location: {
      linkType: "dynamic",
      type: "integrations:huddle01_video",
      label: "Huddle01 Video",
    },
  },
  dirName: "huddle01video",
  concurrentMeetings: true,
  isOAuth: false,
} as AppMeta;

export default metadata;
