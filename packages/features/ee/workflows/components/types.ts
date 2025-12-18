import type { Retell } from "retell-sdk";

export type CallData = Retell.WebCallResponse | Retell.PhoneCallResponse;

export type CallDetailsPayload = {
  showModal: boolean;
  selectedCall?: CallData;
};

export type CallDetailsState = {
  callDetailsSheet: CallDetailsPayload;
};

export type CallDetailsAction =
  | {
      type: "OPEN_CALL_DETAILS";
      payload: CallDetailsPayload;
    }
  | {
      type: "CLOSE_MODAL";
    };
