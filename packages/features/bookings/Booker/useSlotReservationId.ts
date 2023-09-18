// TODO: It would be lost on refresh, so we need to persist it.
// Though, we are persisting it in a cookie(`uid` cookie is set through reserveSlot call)
// but that becomes a third party cookie in context of embed and thus isn't accessible inside embed
// So, we need to persist it in top window as first party cookie in that case.
let slotReservationId: null | string = null;

export const useSlotReservationId = () => {
  function set(uid: string) {
    slotReservationId = uid;
  }
  function get() {
    return slotReservationId;
  }
  return [get(), set] as const;
};
