import process from "node:process";
import dynamic from "next/dynamic";
import { Fragment } from "react";

const DynamicHelpscoutProvider = process.env.NEXT_PUBLIC_HELPSCOUT_KEY
  ? dynamic(() => import("./provider"))
  : Fragment;

export default DynamicHelpscoutProvider;
