export default function parseJSONSafely(str: string) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error((e as Error).message);
    return {};
  }
}
