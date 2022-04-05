import { useSession } from "next-auth/react";
import { FC } from "react";

/**
 * This component will only render it's children if the installation has a valid
 * license.
 */
const LicenseRequired: FC = ({ children }) => {
  const session = useSession();
  return <>{session.data?.hasValidLicense ? children : null}</>;
};

export default LicenseRequired;
