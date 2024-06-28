export type Reference = {
  id: number;
  uid: string;
  type: string;
  meetingUrl: string | null;
  meetingPassword: string | null;
};

export const getCalVideoReference = (references: Reference[]) => {
  const videoReferences = references.filter((reference) => reference.type.includes("_video"));
  const latestVideoReference = videoReferences[videoReferences.length - 1];
  return latestVideoReference;
};
