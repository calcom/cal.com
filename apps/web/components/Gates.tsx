import dynamic from "next/dynamic";
import type { Dispatch } from "react";
import { useState, useEffect } from "react";
import type { JSONObject } from "superjson/dist/types";

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

export default Gates;
