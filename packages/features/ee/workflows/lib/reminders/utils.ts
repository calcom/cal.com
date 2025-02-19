import { dub } from "@calcom/features/auth/lib/dub";

export const bulkShortenLinks = async (links: string[]) => {
  const linksToShorten = links.filter((link) => link);
  const results = await dub.links.createMany(
    linksToShorten.map((link) => ({
      domain: "sms.cal.com",
      url: link,
      folderId: "fold_wx3NZDKQYbLDbncSubeMu0ss",
    }))
  );
  return links.map((link) => {
    const createdLink = results.find(
      (result): result is Extract<typeof result, { url: string }> =>
        !("error" in result) && result.url === link
    );
    if (createdLink) {
      return { shortLink: createdLink.shortLink };
    } else {
      return { shortLink: link };
    }
  });
};
