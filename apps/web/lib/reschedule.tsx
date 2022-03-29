import EventManager from "@calcom/core/EventManager";

export const rescheduleUpdateOriginalBooking = async (originalBookingUId: string) => {
  // Use EventManager to conditionally use all needed integrations.
  const updateManager = await EventManager.update(evt, originalBookingUId);
  return updateManager.results;
};
