import { PlainClient } from "@team-plain/typescript-sdk";

export const plain = new PlainClient({
  apiKey: process.env.PLAIN_API_KEY || "",
});

type PlainUser = {
  name?: string | null;
  email: string;
  id: number;
};

export const upsertPlainCustomer = async (user: PlainUser) => {
  const fullName = user.name ?? user.email;
  const shortName = user.name ?? user.email?.split("@")[0];
  const email = user.email;

  return await plain.upsertCustomer({
    identifier: {
      emailAddress: email,
    },
    onCreate: {
      fullName,
      shortName,
      email: {
        email,
        isVerified: true,
      },
    },
    onUpdate: {},
  });
};
