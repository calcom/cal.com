export default function now(timeZone: string) {
  return new Date().toLocaleString("en-US", {
    timeZone,
  });
}
