import { useState } from "react";

import RainbowGate from "@calcom/app-store/rainbow/components/RainbowKit";

type Gate = undefined | "rainbow"; // Add more like ` | "geolocation" | "payment"`

type GateProps = {
  children: React.ReactNode;
  gates: Gate[];
};

// To add a new Gate just add the gate logic to the switch statement
const Gates: React.FC<GateProps> = ({ children, gates }) => {
  const [rainbowToken, setRainbowToken] = useState<string | undefined>();

  let gateWrappers = <>{children}</>;

  // Incrementally wraps the children with new gates allowing for multiple gates
  for (const gate of gates) {
    switch (gate) {
      case "rainbow":
        if (!rainbowToken) {
          gateWrappers = (
            <RainbowGate
              openGate={setRainbowToken}
              chainId={1}
              tokenAddress="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48">
              {/* tokenAddress="0xD8B4359143eda5B2d763E127Ed27c77addBc47d3"> */}
              {gateWrappers}
            </RainbowGate>
          );
        }
    }
  }

  return gateWrappers;
};

export default Gates;
