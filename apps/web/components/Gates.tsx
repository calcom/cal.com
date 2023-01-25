import dynamic from "next/dynamic";
import { createContext, Dispatch, useContext, useEffect } from "react";
import { JSONObject } from "superjson/dist/types";

export type Gate = undefined | "rainbow"; // Add more like ` | "geolocation" | "payment"`

export type GateState = {
  rainbowToken?: string;
};

const initialState: GateState = {
  rainbowToken: "",
};

const GateStateContext = createContext({
  gateState: initialState,
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  setGateState: (newState: Partial<GateState>) => {},
});

export function useGateState() {
  return useContext(GateStateContext);
}

type GateProps = {
  children: React.ReactNode;
  gates: Gate[];
  appData: JSONObject;
  dispatch: Dispatch<Partial<GateState>>;
};

const RainbowGate = dynamic(() => import("@calcom/app-store/rainbow/components/RainbowKit"));

// To add a new Gate just add the gate logic to the switch statement
const Gates: React.FC<GateProps> = ({ children, gates, appData, dispatch }) => {
  const { gateState, setGateState } = useGateState();

  useEffect(() => {
    dispatch(gateState);
  }, [gateState, dispatch]);

  let gateWrappers = <>{children}</>;

  // Recursively wraps the `gateWrappers` with new gates allowing for multiple gates
  for (const gate of gates) {
    switch (gate) {
      case "rainbow":
        if (appData.blockchainId && appData.smartContractAddress && !gateState.rainbowToken) {
          gateWrappers = (
            <RainbowGate
              setToken={(rainbowToken) => setGateState({ rainbowToken })}
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
