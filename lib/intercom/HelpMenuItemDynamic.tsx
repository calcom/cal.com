import dynamic from "next/dynamic";
import { Fragment } from "react";

const HelpMenuItemDynamic = process.env.NEXT_PUBLIC_INTERCOM_APP_ID
  ? dynamic(() => import("./HelpMenuItem"))
  : Fragment;

export default HelpMenuItemDynamic;
