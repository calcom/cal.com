import dynamic from "next/dynamic";

// Preload caused by dynamic import doesn't seem to add nonce and thus preload fails but the functionality still works - https://github.com/vercel/next.js/issues/81260
// When Plain Chat is disabled, export a no-op component that safely ignores any props.
const Noop = (_props: unknown) => null;

export default process.env.NEXT_PUBLIC_PLAIN_CHAT_ID ? dynamic(() => import("./plainChat")) : Noop;
