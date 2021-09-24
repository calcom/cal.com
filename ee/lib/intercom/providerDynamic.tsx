import dynamic from "next/dynamic";
import { Fragment } from "react";

const DynamicIntercomProvider = process.env.NEXT_PUBLIC_INTERCOM_APP_ID
  ? dynamic(() => import("./provider"))
  : Fragment;

export default DynamicIntercomProvider;
