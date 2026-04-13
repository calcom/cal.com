"use client";

import { useReducer } from "react";

import type { OAuthClientStatus } from "@calcom/prisma/enums";

export const STATUS_OPTIONS: { value: OAuthClientStatus; labelKey: string }[] = [
  { value: "PENDING", labelKey: "pending" },
  { value: "APPROVED", labelKey: "approved" },
  { value: "REJECTED", labelKey: "rejected" },
];

type State = {
  statusFilter: OAuthClientStatus;
  page: number;
};

type Action =
  | { type: "SET_STATUS"; status: OAuthClientStatus }
  | { type: "SET_PAGE"; page: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_STATUS":
      return { statusFilter: action.status, page: 1 };
    case "SET_PAGE":
      return { ...state, page: action.page };
  }
}

export function useClientListState() {
  const [state, dispatch] = useReducer(reducer, { statusFilter: "PENDING", page: 1 });

  return {
    ...state,
    setStatus: (status: string) => {
      if (STATUS_OPTIONS.some((o) => o.value === status)) {
        dispatch({ type: "SET_STATUS", status: status as OAuthClientStatus });
      }
    },
    setPage: (page: number) => dispatch({ type: "SET_PAGE", page }),
  } as const;
}
