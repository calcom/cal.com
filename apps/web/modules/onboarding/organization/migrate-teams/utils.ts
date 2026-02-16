export const getSuggestedSlug = ({
  teamSlug,
  orgSlug,
}: {
  teamSlug: string | null;
  orgSlug: string | null;
}) => {
  // If there is no orgSlug, we can't suggest a slug
  if (!teamSlug || !orgSlug) {
    return teamSlug;
  }

  return teamSlug.replace(`${orgSlug}-`, "").replace(`-${orgSlug}`, "");
};
