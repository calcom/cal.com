import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Feishu Calendar",
  description:
    "Feishu Calendar is a time management and scheduling service developed by Feishu. Allows users to create and edit events, with options available for type and time. Available to anyone that has a Feishu account on both mobile and web versions.",
  installed: true,
  type: "feishu_calendar",
  title: "Feishu Calendar",
  variant: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Feishu",
  slug: "feishu-calendar",
  url: "https://feishu.cn/",
  email: "alan@larksuite.com",
  dirName: "feishucalendar",
} as AppMeta;

export default metadata;
