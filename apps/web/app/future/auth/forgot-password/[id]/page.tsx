import SetNewUserPassword from "@pages/auth/forgot-password/[id]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";

import { getServerSideProps } from "@server/lib/forgot-password/[id]/getServerSideProps";

export const generateMetadata = async () => {
  return await _generateMetadata(
    (t) => t("reset_password"),
    (t) => t("change_your_password")
  );
};

export default WithLayout({
  getLayout: null,
  Page: SetNewUserPassword,
  getData: withAppDirSsr(getServerSideProps),
})<"P">;
