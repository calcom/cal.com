export const validJson = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.log("Invalid JSON:", e);
    return false;
  }
};
