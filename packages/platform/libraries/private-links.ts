// Thin barrel for private-links utils used by API v2
// Expose generateHashedLink and isLinkExpired from core lib under a stable platform-libraries import path
export { generateHashedLink } from "@calcom/lib/generateHashedLink";
export { isLinkExpired } from "@calcom/lib/hashedLinksUtils";

