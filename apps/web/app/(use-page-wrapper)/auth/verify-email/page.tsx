import { _generateMetadata } from "app/_utils";

import VerifyEmailPage from "~/auth/verify-email-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("verify_email"),
    () => ""
  );
};

const ServerPageWrapper = async () => {
  return <VerifyEmailPage />;
};

export default ServerPageWrapper;
