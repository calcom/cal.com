import dynamic from "next/dynamic";
import { Fragment } from "react";

import { AppConfig } from "@calcom/web/app-config";

const DynamicIntercomProvider = AppConfig.env.NEXT_PUBLIC_INTERCOM_APP_ID
  ? dynamic(() => import("./provider"))
  : Fragment;

export default DynamicIntercomProvider;
