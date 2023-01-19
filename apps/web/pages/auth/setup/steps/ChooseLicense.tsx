import { DeploymentLicenseType } from "@prisma/client";
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
  const mutation = trpc.viewer.auth.deploymentSetup.useMutation({
    onSuccess: () => {
      router.replace(`/auth/setup?step=3${isFreeLicense ? "&category=calendar" : ""}`);
    },
  });
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
      <div className="grid grid-cols-2 gap-4">
        <div
          className={classNames(
            "cursor-pointer space-y-2 rounded-md border p-4 hover:border-black",
            isFreeLicense && "border-black"
          )}
          onClick={() => setIsFreeLicense(true)}>
          <h2 className="font-cal text-xl text-black">{t("agplv3_license")}</h2>
          <p className="font-medium text-green-800">{t("free_license_fee")}</p>
          <p className="text-gray-500">{t("forever_open_and_free")}</p>
          <ul className="ml-4 list-disc text-xs text-gray-500">
            <li>{t("required_to_keep_your_code_open_source")}</li>
            <li>{t("cannot_repackage_and_resell")}</li>
            <li>{t("no_enterprise_features")}</li>
          </ul>
        </div>
        <div
          className={classNames(
            "cursor-pointer space-y-2 rounded-md border p-4 hover:border-black",
            !isFreeLicense && "border-black"
          )}
          onClick={() => setIsFreeLicense(false)}>
          <h2 className="font-cal text-xl text-black">{t("ee_enterprise_license")}</h2>
          <p className="font-medium text-green-800">{t("enterprise_booking_fee")}</p>
          <p className="text-gray-500">{t("enterprise_license_includes")}</p>
          <ul className="ml-4 list-disc text-xs text-gray-500">
            <li>{t("no_need_to_keep_your_code_open_source")}</li>
            <li>{t("repackage_rebrand_resell")}</li>
            <li>{t("a_vast_suite_of_enterprise_features")}</li>
          </ul>
        </div>
      </div>
    </form>
  );
};

export default ChooseLicense;
