import { Logger } from "@nestjs/common";

const logger = new Logger("StripeUtils");

export const getReturnToValueFromQueryState = (queryState: string | string[] | undefined) => {
  let returnTo = "";
  try {
    returnTo = JSON.parse(`${queryState}`).returnTo;
  } catch (error) {
    logger.log("No 'returnTo' in req.query.state");
  }
  return returnTo;
};

export const getOnErrorReturnToValueFromQueryState = (queryState: string | string[] | undefined) => {
  let returnTo = "";
  try {
    returnTo = JSON.parse(`${queryState}`).onErrorReturnTo;
  } catch (error) {
    logger.log("No 'onErrorReturnTo' in req.query.state");
  }
  return returnTo;
};
