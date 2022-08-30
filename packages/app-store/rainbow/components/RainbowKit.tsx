import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { infuraProvider } from "wagmi/providers/infura";
import { publicProvider } from "wagmi/providers/public";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import { SUPPORTED_CHAINS } from "../utils/ethereum";

// Optionally grabs Alchemy, Infura, in addition to public providers
const getProviders = () => {
  let providers = []; // eslint-disable-line prefer-const

  if (process.env.ALCHEMY_API_KEY) {
    providers.push(alchemyProvider({ apiKey: process.env.ALCHEMY_API_KEY }));
  }

  if (process.env.INFURA_API_KEY) {
    providers.push(infuraProvider({ apiKey: process.env.INFURA_API_KEY }));
  }

  // Public provider will always be available as fallback, but having at least
  // on of either Infura or Alchemy providers is highly recommended
  providers.push(publicProvider());

  return providers;
};

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
  openGate: (_: string) => void;
};

const RainbowGate: React.FC<RainbowGateProps> = ({ children, openGate }) => {
  const { t } = useLocale();

  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <main className="mx-auto max-w-3xl py-24 px-4">
          <div
            className="rounded-md border border-neutral-200 dark:border-neutral-700 dark:hover:border-neutral-600"
            data-testid="event-types">
            <div className="hover:border-brand dark:bg-darkgray-100 group relative border-b border-neutral-200 bg-white first:rounded-t-md last:rounded-b-md last:border-b-0 hover:bg-white dark:border-neutral-700 dark:hover:border-neutral-600">
              TODO
            </div>
          </div>
        </main>
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

export default RainbowGate;
