import dynamic from "next/dynamic";
import { Fragment } from "react";

import { AppConfig } from "@calcom/web/app-config";

const DynamicHelpscoutProvider = AppConfig.env.NEXT_PUBLIC_HELPSCOUT_KEY
  ? dynamic(() => import("./provider"))
  : Fragment;

export default DynamicHelpscoutProvider;
