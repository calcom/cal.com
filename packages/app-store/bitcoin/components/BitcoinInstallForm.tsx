import { z } from "zod";

import { SetAppDataGeneric } from "@calcom/app-store/EventTypeAppContext";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { appDataSchema } from "../zod";

type BitcoinInstallFormProps = {
  setAppData: SetAppDataGeneric<typeof appDataSchema>;
} & Pick<z.infer<typeof appDataSchema>, "lnUrlName" | "priceInSats">;

const BitcoinInstallForm: React.FC<BitcoinInstallFormProps> = ({ setAppData, lnUrlName, priceInSats }) => {
  const { t } = useLocale();

  return (
    <>
      <div className="mt-4 block items-center sm:flex">
        <div className="min-w-48 mb-4 sm:mb-0">
          <label htmlFor="lnUrlName" className="flex text-sm font-medium text-neutral-700">
            {t("LN Name")}
          </label>
        </div>
        <input
          type="text"
          className="block w-full rounded-sm border-gray-300 text-sm "
          placeholder={t("Example: totenfluch@ln.coinkit.de")}
          defaultValue={(lnUrlName || "") as string}
          onChange={(e) => {
            setAppData("lnUrlName", e.target.value);
          }}
        />
      </div>
      <div className="block items-center sm:flex">
        <div className="min-w-48 mb-4 sm:mb-0">
          <label htmlFor="priceInSats" className="flex text-sm font-medium text-neutral-700">
            {t("priceInSats")}
          </label>
        </div>
        <div className="w-full">
          <div className="relative mt-1 rounded-sm">
            <input
              type="number"
              className="block w-full rounded-sm border-gray-300 text-sm "
              placeholder="1000"
              defaultValue={(priceInSats || "") as string}
              onChange={(e) => {
                setAppData("priceInSats", parseInt(e.target.value));
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default BitcoinInstallForm;
