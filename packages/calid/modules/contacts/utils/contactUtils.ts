export const getContactInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const getContactSecondaryPhones = (metadata: unknown, primaryPhone: string) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }

  const secondaryPhonesValue = (metadata as { secondaryPhones?: unknown }).secondaryPhones;
  if (!Array.isArray(secondaryPhonesValue)) {
    return [];
  }

  const primaryComparablePhone = primaryPhone.trim();
  const seen = new Set<string>();

  return secondaryPhonesValue
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== primaryComparablePhone)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
};

type CreateAvailabilityShareLinkInput = {
  bookerUrl: string;
  eventSlug: string;
  username?: string | null;
  teamSlug?: string | null;
  isOrgTeam?: boolean;
};

export const createAvailabilityShareLink = ({
  bookerUrl,
  eventSlug,
  username,
  teamSlug,
  isOrgTeam = false,
}: CreateAvailabilityShareLinkInput) => {
  const normalizedBookerUrl = bookerUrl.replace(/\/+$/, "");
  const ownerPath = teamSlug ? (isOrgTeam ? teamSlug : `team/${teamSlug}`) : username ? username : null;

  if (!ownerPath || !eventSlug) {
    return "";
  }

  return `${normalizedBookerUrl}/${ownerPath}/${eventSlug}`;
};
