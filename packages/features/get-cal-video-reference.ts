import type { BookingReference } from "@prisma/client";

export const getCalVideoReference = (references: BookingReference[]) => {
  const videoReferences = references.filter((reference) => reference.type.includes("_video"));
  const latestVideoReference = videoReferences[videoReferences.length - 1];
  return latestVideoReference;
};
