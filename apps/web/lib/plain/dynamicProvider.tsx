import dynamic from "next/dynamic";
import { Fragment } from "react";

export default process.env.NEXT_PUBLIC_PLAIN_CHAT_ID ? dynamic(() => import("./plainChat")) : Fragment;
