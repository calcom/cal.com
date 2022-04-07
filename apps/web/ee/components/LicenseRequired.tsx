import { useSession } from "next-auth/react";
import { FC } from "react";

import { Dialog, DialogContent, DialogTrigger } from "@calcom/ui/Dialog";

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
        <Dialog name="enterprise" clearQueryParamsOnClose={["enterprise"]}>
          <DialogTrigger asChild>
            <div
              className="cursor-not-allowed opacity-50"
              title="This is an enterprise feature, to enable please refer to cal.com/enterprise">
              <div className="pointer-events-none">{children}</div>
            </div>
          </DialogTrigger>
          {/* TODO: Make this content better */}
          <DialogContent>
            This is an Enterprise feature, to enable it please refer to{" "}
            <a
              href="https://cal.com/enterprise"
              target="_blank"
              rel="noopener noreferrer"
              className="underline">
              cal.com/enterprise
            </a>
            .
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default LicenseRequired;
