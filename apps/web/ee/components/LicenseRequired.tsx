import { ExclamationIcon } from "@heroicons/react/solid";
import { useSession } from "next-auth/react";
import { AriaRole, FC, Fragment } from "react";

import EmptyScreen from "@components/EmptyScreen";

type LicenseRequiredProps = {
  as?: keyof JSX.IntrinsicElements | "";
  className?: string;
  role?: AriaRole | undefined;
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
              To enable this feature, please refer to{" "}
              <a
                href="https://cal.com/enterprise"
                target="_blank"
                rel="noopener noreferrer"
                className="underline">
                cal.com/enterprise
              </a>
              .
            </>
          }
        />
      )}
    </Component>
  );
};

export default LicenseRequired;
