export default function parseJSONSafely(str: string) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error((e as Error).message);
    if ((e as Error).message.includes("Unexpected token")) {
      return {
        success: false,
        message: `Invalid JSON in the body: ${(e as Error).message}`,
      };
    }
    return {};
  }
}
