export const getErrorString = (errorCode: string | undefined) => {
  if (errorCode === "404") {
    return `Error Code: 404. Cal Link seems to be wrong.`;
  } else {
    return `Error Code: ${errorCode}. Something went wrong.`;
  }
};
