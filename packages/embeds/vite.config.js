const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
process.env.EMBED_PUBLIC_VERCEL_URL = process.env.VERCEL_URL;
process.env.EMBED_PUBLIC_WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL;
process.env.EMBED_PUBLIC_EMBED_LIB_URL = process.env.NEXT_PUBLIC_EMBED_LIB_URL;
process.env.EMBED_PUBLIC_EMBED_FINGER_PRINT = process.env.NEXT_PUBLIC_EMBED_FINGER_PRINT;

// Problem: typeof process.env.EMBED_PUBLIC_EMBED_LIB_URL is "undefined"(truthy) if process.env.NEXT_PUBLIC_EMBED_LIB_URL is undefined(falsy)
// This is probably because environment variables are always string, so this weird automatic conversion to string happens
// HACKY Solution
if (process.env.EMBED_PUBLIC_EMBED_LIB_URL === "undefined") {
  delete process.env.EMBED_PUBLIC_EMBED_LIB_URL;
}

if (process.env.EMBED_PUBLIC_WEBAPP_URL === "undefined") {
  delete process.env.EMBED_PUBLIC_WEBAPP_URL;
}

if (process.env.EMBED_PUBLIC_VERCEL_URL === "undefined") {
  delete process.env.EMBED_PUBLIC_VERCEL_URL;
}

const viteBaseConfig = {
  envPrefix: "EMBED_PUBLIC_",
};
export default viteBaseConfig;
