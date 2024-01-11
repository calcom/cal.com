import Provider from "@pages/auth/sso/[provider]";
import { withAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";

export default WithLayout({
  getLayout: null,
  Page: Provider,
  getData: withAppDir(getServerSideProps),
})<"P">;
