import { Dub } from "dub";

export const dub = new Dub({
  token: process.env.DUB_API_KEY,
});

// fetch Dub customer using their external ID (ID in our database)
export const getDubCustomer = async (userId: string) => {
  if (!process.env.DUB_API_KEY) {
    return null;
  }

  const customer = await dub.customers.list({
    externalId: userId,
    includeExpandedFields: true,
  });

  return customer.length > 0 ? customer[0] : null;
};
