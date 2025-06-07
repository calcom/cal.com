import { canUseCookies } from "@calcom/lib/cookie";

let slotReservationId: null | string = null;
let cookieAvailabilityChecked = false;
let canUseSlotReservation = false;

const checkCookieAvailability = () => {
  if (!cookieAvailabilityChecked) {
    canUseSlotReservation = canUseCookies();
    cookieAvailabilityChecked = true;
  }
  return canUseSlotReservation;
};

export const useSlotReservationId = () => {
  function set(uid: string) {
    if (checkCookieAvailability()) {
      slotReservationId = uid;
    }
  }
  function get() {
    return checkCookieAvailability() ? slotReservationId : null;
  }
  return [get(), set] as const;
};
