import { SatSymbol } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { fiat } from "@getalby/lightning-tools";
import React from "react";

type AlbyPriceComponentProps = {
  displaySymbol: boolean;
  price: number;
  formattedPrice: string;
};

export function AlbyPriceComponent({ displaySymbol, price, formattedPrice }: AlbyPriceComponentProps) {
  const [fiatValue, setFiatValue] = React.useState<string>("loading...");
  React.useEffect(() => {
    (async () => {
      const unformattedFiatValue = await fiat.getFiatValue({ satoshi: price, currency: "USD" });
      setFiatValue(`$${unformattedFiatValue.toFixed(2)}`);
    })();
  }, [price]);

  return (
    <Tooltip content={fiatValue}>
      <div className="inline-flex items-center justify-center">
        {displaySymbol && <SatSymbol className="h-4 w-4" />}
        {formattedPrice}
      </div>
    </Tooltip>
  );
}
