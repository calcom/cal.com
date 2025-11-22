import type { AppMeta } from "@calcom/types/App";
import _package from "./package.json";

export const metadata = {
    name: "Razorpay",
    description: _package.description,
    installed: false,
    slug: "razorpay",
    category: "payment",
    categories: ["payment"],
    logo: "icon.svg",
    publisher: "Cal.com",
    title: "Razorpay",
    type: "razorpay_payment",
    url: "https://razorpay.com/",
    docsUrl: "https://razorpay.com/docs",
    variant: "payment",
    extendsFeature: "EventType",
    email: "help@razorpay.com",
    dirName: "razorpay",
} as AppMeta;

export default metadata;