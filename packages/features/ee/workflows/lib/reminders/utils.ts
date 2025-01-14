import { dub } from "@calcom/features/auth/lib/dub";

export const getShortenLink = (link: string) => {
  // don't hit dub with with empty string
  if (!link.length) {
    const pr: Promise<string> = new Promise((resolve) => resolve(link));
    return pr;
  } else {
    return dub.links.create({
      url: link,
      domain: "sms.cal.com",
    });
  }
};
