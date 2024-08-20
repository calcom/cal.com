export const getReturnToValueFromQueryState = (queryState: string | string[] | undefined) => {
  let returnTo = "";
  try {
    returnTo = JSON.parse(`${queryState}`).returnTo;
  } catch (error) {
    console.info("No 'returnTo' in req.query.state");
  }
  return returnTo;
};
