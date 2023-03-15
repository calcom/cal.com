import dynamic from "next/dynamic";
import type { Dispatch } from "react";
import { useReducer } from "react";
import React, { useState, useEffect } from "react";
import type { JSONObject } from "superjson/dist/types";

import { getEventTypeAppData } from "@calcom/app-store/utils";
import { useBookerStore } from "@calcom/features/bookings/Booker/store";
import { useEvent } from "@calcom/features/bookings/Booker/utils/event";

export type Gate = undefined | "rainbow"; // Add more like ` | "geolocation" | "payment"`

export type GateState = {
  rainbowToken?: string;
};

type GateProps = {
  children: React.ReactNode;
  gates: Gate[];
  appData: JSONObject;
  dispatch: Dispatch<Partial<GateState>>;
};

const RainbowGate = dynamic(() => import("@calcom/app-store/rainbow/components/RainbowKit"));

// To add a new Gate just add the gate logic to the switch statement
const Gates: React.FC<GateProps> = ({ children, gates, appData, dispatch }) => {
  const [rainbowToken, setRainbowToken] = useState<string>();

  useEffect(() => {
    dispatch({ rainbowToken });
  }, [rainbowToken, dispatch]);

  let gateWrappers = <>{children}</>;

  // Recursively wraps the `gateWrappers` with new gates allowing for multiple gates
  for (const gate of gates) {
    switch (gate) {
      case "rainbow":
        if (appData.blockchainId && appData.smartContractAddress && !rainbowToken) {
          gateWrappers = (
            <RainbowGate
              setToken={setRainbowToken}
              chainId={appData.blockchainId as number}
              tokenAddress={appData.smartContractAddress as string}>
              {gateWrappers}
            </RainbowGate>
          );
        }
    }
  }

  return gateWrappers;
};

/**
 * This BookerGates component is only used with the NEW booker.
 * This component is responsible for fetching the bookers data
 * (instead of accepting it as props) and then passing it along
 * to the Gates component.
 */
export const BookerGates = ({ children }: { children: React.ReactNode }) => {
  const event = useEvent();
  const setEthSignature = useBookerStore((state) => state.setEthSignature);
  const rainbowAppData = event?.data ? getEventTypeAppData(event.data, "rainbow") || {} : {};
  const gates = [];
  if (rainbowAppData && rainbowAppData.blockchainId && rainbowAppData.smartContractAddress) {
    gates.push("rainbow");
  }

  const [gateState, gateDispatcher] = useReducer(
    (state: GateState, newState: Partial<GateState>) => ({
      ...state,
      ...newState,
    }),
    {}
  );

  useEffect(() => {
    setEthSignature(gateState.rainbowToken);
  }, [gateState, setEthSignature]);

  return (
    <Gates gates={gates} appData={rainbowAppData} dispatch={gateDispatcher}>
      {children}
    </Gates>
  );
};

export default Gates;
