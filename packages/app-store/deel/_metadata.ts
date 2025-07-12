import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Deel",
  description:
    "Integrate Deel with your Calendar and automatically create time-off requests when you're out of office.",
  installed: true,
  type: "deel_other",
  title: "Deel Time Off",
  variant: "other",
  categories: ["other"],
  logo: "icon.svg",
  publisher: "Deel.com",
  slug: "deel",
  url: "https://go.cal.com/deel",
  email: "support@deel.com",
  dirName: "deel",
  isOAuth: true,
} as AppMeta;

export default metadata;
