import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import VerifyEmailPage from "~/auth/verify-email-view";

export const generateMetadata = async () => {
  return await _generateMetadata(
    () => "Verify email",
    () => ""
  );
};

export default WithLayout({
  getLayout: null,
  Page: VerifyEmailPage,
})<"P">;
