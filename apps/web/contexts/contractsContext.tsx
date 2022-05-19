import noop from "lodash/noop";
import { createContext, ReactNode, useContext } from "react";

import { localStorage } from "@calcom/lib/webstorage";

type contractsContextType = {
  contracts: Record<string, string>;
  addContract: (payload: addContractsPayload) => void;
};

const contractsContextDefaultValue: contractsContextType = {
  contracts: {},
  addContract: noop,
};

const ContractsContext = createContext<contractsContextType>(contractsContextDefaultValue);

export function useContracts() {
  return useContext(ContractsContext);
}

type Props = {
  children: ReactNode;
};

interface addContractsPayload {
  address: string;
  signature: string;
}

export function ContractsProvider({ children }: Props) {
  const addContract = (payload: addContractsPayload) => {
    localStorage.setItem(
      "contracts",
      JSON.stringify({
        ...JSON.parse(localStorage.getItem("contracts") || "{}"),
        [payload.address]: payload.signature,
      })
    );
  };

  const value = {
    contracts: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("contracts") || "{}") : {},
    addContract,
  };

  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>;
}
