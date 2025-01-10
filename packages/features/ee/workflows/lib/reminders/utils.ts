import { dub } from "@calcom/features/auth/lib/dub";

export const bulkShortenLinks = async (links: string[]) => {
  const linksToShorten = links.filter((link) => link.startsWith("http"));
  const results = await dub.links.createMany(links.map((link) => ({ domain: "sms.cal.com", url: link })));

  return links.map((link) => {
    const createdLink = results.find((result) => result.url === link);
    if (createdLink) {
      return { shortLink: createdLink.shortLink };
      // if invalid link, return the original link as it is
    } else {
      return { shortLink: link };
    }
  });
};
