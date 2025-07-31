import dynamic from "next/dynamic";
import { Fragment } from "react";

// Preload caused by dynamic import doesn't seem to add nonce and thus preload fails but the functionality still works - https://github.com/vercel/next.js/issues/81260
export default process.env.NEXT_PUBLIC_PLAIN_CHAT_ID ? dynamic(() => import("./plainChat")) : Fragment;
