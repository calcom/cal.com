import { ExclamationIcon } from "@heroicons/react/solid";
import { useSession } from "next-auth/react";
import { FC } from "react";

import EmptyScreen from "@components/EmptyScreen";

/**
 * This component will only render it's children if the installation has a valid
 * license.
 */
const LicenseRequired: FC = ({ children }) => {
  const session = useSession();
  return (
    <>
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
    </>
  );
};

export default LicenseRequired;
