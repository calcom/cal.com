import VerifyEmailPage from "@pages/auth/verify-email";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("check_your_email"),
    (t) => t("check_your_email")
  );
};

export default WithLayout({
  getLayout: null,
  Page: VerifyEmailPage,
})<"P">;
