import process from "node:process";
import type { AppMeta } from "@calcom/types/App";
import _package from "./package.json";

export const metadata = {
  name: "ZoomInfo",
  installed: !!process.env.ZOOMINFO_CLIENT_ID,
  description: _package.description,
  type: "zoominfo_other",
  variant: "other",
  logo: "icon.svg",
  publisher: "Cal.com",
  url: "https://zoominfo.com/",
  categories: ["other"],
  label: "ZoomInfo",
  slug: "zoominfo",
  extendsFeature: "EventType",
  title: "ZoomInfo",
  email: "help@cal.com",
  dirName: "zoominfo",
  isOAuth: true,
} as AppMeta;

export default metadata;
