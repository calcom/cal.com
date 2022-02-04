import { createContext, ReactNode, useContext } from "react";

type contractsContextType = Record<string, string>;

const contractsContextDefaultValue: contractsContextType = {};

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
    window.localStorage.setItem(
      "contracts",
      JSON.stringify({
        ...JSON.parse(window.localStorage.getItem("contracts") || "{}"),
        [payload.address]: payload.signature,
      })
    );
  };

  const value = {
    contracts:
      typeof window !== "undefined" ? JSON.parse(window.localStorage.getItem("contracts") || "{}") : {},
    addContract,
  };

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>
    </>
  );
}
