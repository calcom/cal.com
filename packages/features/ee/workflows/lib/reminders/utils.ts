import { dub } from "@calcom/features/auth/lib/dub";

export type EventLinks = {
  meetingUrl: string;
  cancelLink: string;
  rescheduleLink: string;
  ratingUrl: string;
  noShowUrl: string;
};

export const getShortenLinks = async (longLinks: EventLinks) => {
  const shortLinks: EventLinks = {
    meetingUrl: "",
    cancelLink: "",
    rescheduleLink: "",
    ratingUrl: "",
    noShowUrl: "",
  };

  const linkTypes = Object.keys(longLinks);

  for (const link of linkTypes) {
    const linkType = link as keyof EventLinks;
    const url = longLinks[linkType];

    if (url) {
      const { shortLink } = await dub.links.create({
        url,
      });
      shortLinks[linkType] = shortLink;
    }
  }

  return shortLinks;
};
