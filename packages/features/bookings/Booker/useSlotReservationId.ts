import { useEffect, useRef } from "react";

import { getCookie } from "@calcom/lib/cookie";

export const useSlotReservationId = () => {
  const slotReservationId = useRef<null | string>(null);

  const uid = getCookie("uid");
  useEffect(() => set(uid), [uid]);

  const set = (uid: string) => {
    if (uid) slotReservationId.current = uid;
  };

  return [slotReservationId.current, set];
};
