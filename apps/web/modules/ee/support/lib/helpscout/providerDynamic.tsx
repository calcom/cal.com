import dynamic from "next/dynamic";
import { Fragment } from "react";
import process from "node:process";

const DynamicHelpscoutProvider = process.env.NEXT_PUBLIC_HELPSCOUT_KEY
  ? dynamic(() => import("./provider"))
  : Fragment;

export default DynamicHelpscoutProvider;
