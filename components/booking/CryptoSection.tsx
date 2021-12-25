import { MetaMaskInpageProvider } from "@metamask/providers";
import { useCallback, useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import Web3 from "web3";

import { LocationType } from "@lib/location";

import { Button } from "@components/ui/Button";

import genericAbi from "../../web3/abis/abiWithGetBalance.json";

interface Window {
  ethereum: MetaMaskInpageProvider;
  web3: Web3;
}

declare const window: Window;

type BookingFormValues = {
  name: string;
  email: string;
  notes?: string;
  locationType?: LocationType;
  guests?: string[];
  phone?: string;
  customInputs?: {
    [key: string]: string;
  };
  hasToken: boolean;
};

interface CryptoSectionProps {
  ethEnabled: boolean;
  verifyWallet(): void;
  connectMetamask(): void;
  toggleEthEnabled(arg: boolean): void;
  scAddress: string;
  bookingForm: UseFormReturn<BookingFormValues, Record<string, unknown>>;
}

const CryptoSection = (props: CryptoSectionProps) => {
  // Crypto section which should be shown on booking page if event type requires a smart contract token.
  const [verified, toggleVerified] = useState<boolean>(false); // More performant than using const { hasToken } = props.bookingForm.getValues() every time

  const connectMetamask = useCallback(async () => {
    if (window.ethereum) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      window.web3 = new Web3(window.ethereum);
      props.toggleEthEnabled(true);
    } else {
      props.toggleEthEnabled(false);
    }
  }, [props]);

  const verifyWallet = useCallback(async () => {
    try {
      const contract = new window.web3.eth.Contract(genericAbi, props.scAddress);
      const balance = await contract.methods.balanceOf(window.ethereum.selectedAddress).call();

      const hasToken = balance > 0;

      props.bookingForm.setValue("hasToken", hasToken);
      toggleVerified(hasToken);

      if (!hasToken)
        props.bookingForm.setError("hasToken", {
          message: "Current wallet doesn't own any tokens belonging to the specified smart contract",
        });
    } catch (err) {
      props.bookingForm.setError("hasToken", {
        message: err.message,
      });
    }
  }, [props.scAddress, props.bookingForm]);

  // @TODO: Show error on either of buttons if fails. Yup schema already contains the error message.
  const successButton = useMemo(() => {
    return (
      <Button type="button" disabled>
        Success!
      </Button>
    );
  }, []);

  const verifyButton = useMemo(() => {
    return (
      <Button onClick={verifyWallet} type="button" id="hasToken" name="hasToken">
        Verify wallet
      </Button>
    );
  }, [verifyWallet]);

  const connectButton = useMemo(() => {
    return (
      <Button onClick={connectMetamask} type="button">
        Connect Metamask
      </Button>
    );
  }, [connectMetamask]);

  return (
    <div className="mb-4">
      <label htmlFor="wallet" className="block mb-1 text-sm font-medium text-gray-700 dark:text-white">
        {"Wallet verification"}
        <div>{props.ethEnabled ? (verified ? successButton : verifyButton) : connectButton}</div>
      </label>
    </div>
  );
};

export default CryptoSection;
