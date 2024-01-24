export async function getEventTypeById(props: any) {
  const { getEventTypeById } = await import("@calcom/lib/dist/packages/lib/getEventTypeById");
  return getEventTypeById(props);
}
