import { DeploymentLicenseType } from "@prisma/client";
import classNames from "classnames";
import { useRouter } from "next/router";
import { Dispatch, SetStateAction } from "react";

import { trpc } from "@calcom/trpc/react";

const ChooseLicense = (props: {
  isFreeLicense: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setIsFreeLicense: Dispatch<SetStateAction<boolean>>;
}) => {
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
          <h2 className="font-cal text-xl text-black">AGPLv3 License</h2>
          <p className="font-medium text-green-800">$0.00/month</p>
          <p className="text-gray-500">Forever Open & Free</p>
          <ul className="ml-4 list-disc text-xs text-gray-500">
            <li>Required to keep your code open source</li>
            <li>Cannot repackage & resell</li>
            <li>No enterprise features</li>
          </ul>
        </div>
        <div
          className={classNames(
            "cursor-pointer space-y-2 rounded-md border p-4 hover:border-black",
            !isFreeLicense && "border-black"
          )}
          onClick={() => setIsFreeLicense(false)}>
          <h2 className="font-cal text-xl text-black">“/ee” Enterprise License</h2>
          <p className="font-medium text-green-800">$0.05/booking – min. $189/month</p>
          <p className="text-gray-500">Everything for a commercial use case</p>
          <ul className="ml-4 list-disc text-xs text-gray-500">
            <li>No need to keep your code open source</li>
            <li>Repackage, rebrand, resell</li>
            <li>A vast suite of enterprise features</li>
          </ul>
        </div>
      </div>
    </form>
  );
};

export default ChooseLicense;
