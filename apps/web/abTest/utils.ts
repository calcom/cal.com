import { AB_TEST_BUCKET_PROBABILITY } from "@calcom/lib/constants";

const cryptoRandom = () => {
  return crypto.getRandomValues(new Uint8Array(1))[0] / 0xff;
};

export const getBucket = () => {
  return cryptoRandom() * 100 < AB_TEST_BUCKET_PROBABILITY ? "future" : "legacy";
};
