import type { AppMeta } from "@calcom/types/App";
import _package from "./package.json";

export const metadata = {
    name: "Proton Calendar",
    description: _package.description,
    installed: true,
    type: "proton_calendar",
    title: "Proton Calendar",
    variant: "calendar",
    categories: ["calendar"],
    category: "calendar",
    logo: "icon.svg",
    publisher: "Cal.com",
    slug: "proton-calendar",
    url: "https://proton.me/calendar",
    email: "support@proton.me",
    dirName: "protoncalendar",
    isOAuth: false,
} as AppMeta;

export default metadata;
