export type Reference = { uid: string; type: string; meetingUrl?: string; meetingPassword?: string };

export const getCalVideoReference = (references: Reference[]) => {
  const videoReferences = references.filter((reference) => reference.type.includes("_video"));
  const latestVideoReference = videoReferences[videoReferences.length - 1];
  return latestVideoReference;
};
