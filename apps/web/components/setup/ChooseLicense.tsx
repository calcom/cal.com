import { DeploymentLicenseType } from "@prisma/client";
import * as RadioGroup from "@radix-ui/react-radio-group";
import classNames from "classnames";
import { useRouter } from "next/router";
import { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";

const ChooseLicense = (props: {
  isFreeLicense: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsFreeLicense: Dispatch<SetStateAction<boolean>>;
}) => {
  const { t } = useLocale();
  const router = useRouter();
  const { isFreeLicense, setIsFreeLicense } = props;
  const mutation = trpc.viewer.deploymentSetup.update.useMutation({
    onSuccess: () => {
      router.replace(`/auth/setup?step=3${isFreeLicense ? "&category=calendar" : ""}`);
    },
  });

  const enterprise_booking_fee = "$99"; // TODO: get this from a new API endpoint

  return (
    <form
      id="wizard-step-2"
      name="wizard-step-2"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        props.setIsLoading(true);
        mutation.mutate({
          licenseType: isFreeLicense ? DeploymentLicenseType.FREE : DeploymentLicenseType.EE,
        });
      }}>
      <RadioGroup.Root
        defaultValue={DeploymentLicenseType.FREE}
        aria-label={t("choose_a_license")}
        className="grid grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1"
        onValueChange={(value) => {
          setIsFreeLicense(value === DeploymentLicenseType.FREE);
        }}>
        <RadioGroup.Item value={DeploymentLicenseType.FREE}>
          <div
            className={classNames(
              "cursor-pointer space-y-2 rounded-md border bg-white p-4 hover:border-black",
              isFreeLicense && "border-black"
            )}>
            <h2 className="font-cal text-xl text-black">{t("agplv3_license")}</h2>
            <p className="font-medium text-green-800">{t("free_license_fee")}</p>
            <p className="text-gray-500">{t("forever_open_and_free")}</p>
            <ul className="ml-4 list-disc text-left text-xs text-gray-500">
              <li>{t("required_to_keep_your_code_open_source")}</li>
              <li>{t("cannot_repackage_and_resell")}</li>
              <li>{t("no_enterprise_features")}</li>
            </ul>
          </div>
        </RadioGroup.Item>
        <RadioGroup.Item value={DeploymentLicenseType.EE}>
          <div
            className={classNames(
              "cursor-pointer space-y-2 rounded-md border bg-white p-4 hover:border-black",
              !isFreeLicense && "border-black"
            )}>
            <h2 className="font-cal text-xl text-black">{t("ee_enterprise_license")}</h2>
            <p className="font-medium text-green-800">
              {t("enterprise_booking_fee", { enterprise_booking_fee })}
            </p>
            <p className="text-gray-500">{t("enterprise_license_includes")}</p>
            <ul className="ml-4 list-disc text-left text-xs text-gray-500">
              <li>{t("no_need_to_keep_your_code_open_source")}</li>
              <li>{t("repackage_rebrand_resell")}</li>
              <li>{t("a_vast_suite_of_enterprise_features")}</li>
            </ul>
          </div>
        </RadioGroup.Item>
      </RadioGroup.Root>
    </form>
  );
};

export default ChooseLicense;
