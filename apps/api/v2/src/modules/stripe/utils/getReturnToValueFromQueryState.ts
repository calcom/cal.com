export const getReturnToValueFromQueryState = (queryState: string | string[] | undefined) => {
  let returnTo = "";
  try {
    returnTo = JSON.parse(`${queryState}`).returnTo;
  } catch (_error) {
    console.info("No 'returnTo' in req.query.state");
  }
  return returnTo;
};

export const getOnErrorReturnToValueFromQueryState = (queryState: string | string[] | undefined) => {
  let returnTo = "";
  try {
    returnTo = JSON.parse(`${queryState}`).onErrorReturnTo;
  } catch (_error) {
    console.info("No 'onErrorReturnTo' in req.query.state");
  }
  return returnTo;
};
