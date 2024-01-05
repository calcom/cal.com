import { mapGetServerSidePropsResultForAppDir } from "app/AppDirSSRHOC";
import { WithLayout } from "app/layoutHOC";
import type { GetServerSidePropsContext } from "next";

import { getData } from "@server/lib/signupGetData";

const getDataBuilder = async (context: GetServerSidePropsContext) =>
  mapGetServerSidePropsResultForAppDir(await getData(context));

export default WithLayout({ getLayout: null, getData: getDataBuilder })<"L">;
