import { ExclamationIcon } from "@heroicons/react/solid";
import { useSession } from "next-auth/react";
import React, { AriaRole, ComponentType, FC, Fragment } from "react";

import { CONSOLE_URL } from "@calcom/lib/constants";
import EmptyScreen from "@calcom/ui/EmptyScreen";

type LicenseRequiredProps = {
  as?: keyof JSX.IntrinsicElements | "";
  className?: string;
  role?: AriaRole | undefined;
  children: React.ReactNode;
};

/**
 * This component will only render it's children if the installation has a valid
 * license.
 */
const LicenseRequired: FC<LicenseRequiredProps> = ({ children, as = "", ...rest }) => {
  const session = useSession();
  const Component = as || Fragment;
  return (
    <Component {...rest}>
      {session.data?.hasValidLicense ? (
        children
      ) : (
        <EmptyScreen
          Icon={ExclamationIcon}
          headline="This is an enterprise feature"
          description={
            <>
              To enable this feature, get a deployment key at{" "}
              <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer" className="underline">
                Cal.com console
              </a>
              . If your team already has a license, please contact{" "}
              <a href="mailto:peer@cal.com" className="underline">
                peer@cal.com
              </a>{" "}
              for help.
            </>
          }
        />
      )}
    </Component>
  );
};

export function withLicenseRequired<T>(Component: ComponentType<T>) {
  // eslint-disable-next-line react/display-name
  return (hocProps: T) => {
    return (
      <LicenseRequired>
        <Component {...(hocProps as T)} />;
      </LicenseRequired>
    );
  };
}

export default LicenseRequired;
