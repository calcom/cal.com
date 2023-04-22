import {
  ConnectButton,
  darkTheme,
  getDefaultWallets,
  lightTheme,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useTheme } from "next-themes";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Trans } from "react-i18next";
import { configureChains, createClient, useAccount, useSignMessage, WagmiConfig } from "wagmi";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast, SkeletonText } from "@calcom/ui";
import { AlertTriangle, Loader } from "@calcom/ui/components/icon";

import { ETH_MESSAGE, getProviders, SUPPORTED_CHAINS } from "../utils/ethereum";

const { chains, provider } = configureChains(SUPPORTED_CHAINS, getProviders());

const { connectors } = getDefaultWallets({
  appName: "Cal.com",
  chains,
});

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

type RainbowGateProps = {
  children: React.ReactNode;
  setToken: (_: string) => void;
  chainId: number;
  tokenAddress: string;
};

const RainbowGate: React.FC<RainbowGateProps> = (props) => {
  const { resolvedTheme: theme } = useTheme();
  const [rainbowTheme, setRainbowTheme] = useState(theme === "dark" ? darkTheme() : lightTheme());

  useEffect(() => {
    theme === "dark" ? setRainbowTheme(darkTheme()) : setRainbowTheme(lightTheme());
  }, [theme]);

  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains.filter((chain) => chain.id === props.chainId)} theme={rainbowTheme}>
        <BalanceCheck {...props} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

// The word "token" is used for two differenct concepts here: `setToken` is the token for
// the Gate while `useToken` is a hook used to retrieve the Ethereum token.
const BalanceCheck: React.FC<RainbowGateProps> = ({ chainId, setToken, tokenAddress }) => {
  const { t } = useLocale();
  const { address } = useAccount();
  const {
    data: signedMessage,
    isLoading: isSignatureLoading,
    isError: isSignatureError,
    signMessage,
  } = useSignMessage({
    message: ETH_MESSAGE,
  });
  const { data: contractData, isLoading: isContractLoading } = trpc.viewer.eth.contract.useQuery({
    address: tokenAddress,
    chainId,
  });
  const { data: balanceData, isLoading: isBalanceLoading } = trpc.viewer.eth.balance.useQuery(
    { address: address || "", tokenAddress, chainId },
    {
      enabled: !!address,
    }
  );

  // The token may have already been set in the query params, so we can extract it here
  const router = useRouter();
  const { ethSignature, ...routerQuery } = router.query;

  const isLoading = isContractLoading || isBalanceLoading;

  // Any logic here will unlock the gate by setting the token to the user's wallet signature
  useEffect(() => {
    // If the `ethSignature` is found, remove it from the URL bar and propogate back up
    if (ethSignature !== undefined) {
      // Remove the `ethSignature` param but keep all others
      router.replace({ query: { ...routerQuery } });
      setToken(ethSignature as string);
    }

    if (balanceData && balanceData.data) {
      if (balanceData.data.hasBalance) {
        if (signedMessage) {
          showToast("Wallet verified.", "success");
          setToken(signedMessage);
        } else if (router.isReady && !ethSignature) {
          signMessage();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, balanceData, setToken, signedMessage, signMessage]);

  return (
    <main className="mx-auto max-w-3xl py-24 px-4">
      <div className="rounded-md border border-neutral-200 dark:border-neutral-700 dark:hover:border-neutral-600">
        <div className="hover:border-brand-default dark:bg-darkgray-100 bg-default hover:bg-default flex min-h-[120px] grow flex-col border-b border-neutral-200 p-6 text-center first:rounded-t-md last:rounded-b-md last:border-b-0 dark:border-neutral-700 dark:hover:border-neutral-600 md:flex-row md:text-left">
          <span className="mb-4 grow md:mb-0">
            <h2 className="text-emphasis dark:text-inverted mb-2 grow font-semibold">Token Gate</h2>
            {isLoading && (
              <>
                <SkeletonText className="mb-3 h-1 w-full" />
                <SkeletonText className="h-1 w-full" />
              </>
            )}
            {!isLoading && contractData && contractData.data && (
              <>
                <p className="dark:text-inverted text-gray-300">
                  <Trans i18nKey="rainbow_connect_wallet_gate" t={t}>
                    Connect your wallet if you own {contractData.data.name} ({contractData.data.symbol}) .
                  </Trans>
                </p>

                {balanceData && balanceData.data && (
                  <>
                    {!balanceData.data.hasBalance && (
                      <div className="mt-2 flex flex-row items-center">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <p className="ml-2 text-red-600">
                          <Trans i18nKey="rainbow_insufficient_balance" t={t}>
                            Your connected wallet doesn&apos;t contain enough {contractData.data.symbol}.
                          </Trans>
                        </p>
                      </div>
                    )}

                    {balanceData.data.hasBalance && isSignatureLoading && (
                      <div className="mt-2 flex flex-row items-center">
                        <Loader className="h-5 w-5 text-green-600" />
                        <p className="ml-2 text-green-600">{t("rainbow_sign_message_request")}</p>
                      </div>
                    )}
                  </>
                )}

                {isSignatureError && (
                  <div className="mt-2 flex flex-row items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <p className="ml-2 text-red-600">
                      <Trans i18nKey="rainbow_signature_error" t={t}>
                        {t("rainbow_signature_error")}
                      </Trans>
                    </p>
                  </div>
                )}
              </>
            )}
          </span>
          <span className="ml-10 min-w-[170px] self-center">
            <ConnectButton chainStatus="icon" showBalance={false} />
          </span>
        </div>
      </div>
    </main>
  );
};

export default RainbowGate;
