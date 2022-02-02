import { createContext, ReactNode, useContext, useState } from "react";

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
  const [contracts, setContracts] = useState<Record<string, string>>({});

  const addContract = (payload: addContractsPayload) => {
    setContracts((prevContracts) => ({
      ...prevContracts,
      [payload.address]: payload.signature,
    }));
  };

  const value = {
    contracts,
    addContract,
  };

  return (
    <>
      <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>
    </>
  );
}
