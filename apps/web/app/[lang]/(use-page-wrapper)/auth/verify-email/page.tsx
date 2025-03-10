import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";

import VerifyEmailPage from "~/auth/verify-email-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const t = await getTranslate(params.lang);
  return await _generateMetadata(t("verify_email"), "");
};

const ServerPageWrapper = async () => {
  return <VerifyEmailPage />;
};

export default ServerPageWrapper;
