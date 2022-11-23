/**
 * @deprecated file
 * All new changes should be made to the V2 file in
 * `/packages/features/ee/common/components/v2/LicenseRequired.tsx`
 */
import { useSession } from "next-auth/react";
import React, { AriaRole, ComponentType, Fragment } from "react";

import { CONSOLE_URL } from "@calcom/lib/constants";
import { EmptyScreen, Icon } from "@calcom/ui";

type LicenseRequiredProps = {
  as?: keyof JSX.IntrinsicElements | "";
  className?: string;
  role?: AriaRole | undefined;
  children: React.ReactNode;
};

/**
 * @deprecated file
 * All new changes should be made to the V2 file in
 * `/packages/features/ee/common/components/v2/LicenseRequired.tsx`
 * This component will only render it's children if the installation has a valid
 * license.
 */
const LicenseRequired = ({ children, as = "", ...rest }: LicenseRequiredProps) => {
  const session = useSession();
  const Component = as || Fragment;
  return (
    <Component {...rest}>
      {session.data?.hasValidLicense ? (
        children
      ) : (
        <EmptyScreen
          Icon={Icon.FiAlertTriangle}
          headline="This is an enterprise feature"
          description={
            <>
              To enable this feature, get a deployment key at{" "}
              <a href={CONSOLE_URL} target="_blank" rel="noopener noreferrer" className="underline">
                Cal.com console
              </a>{" "}
              and add it to your .env as <code>CALCOM_LICENSE_KEY</code>. If your team already has a license,
              please contact{" "}
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

export const withLicenseRequired =
  <T,>(Component: ComponentType<T>) =>
  // eslint-disable-next-line react/display-name
  (hocProps: T) =>
    (
      <LicenseRequired>
        <Component {...hocProps} />
      </LicenseRequired>
    );

export default LicenseRequired;
