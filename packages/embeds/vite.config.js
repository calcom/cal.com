require("dotenv").config({ path: "../../.env" });
process.env.EMBED_PUBLIC_VERCEL_URL = process.env.VERCEL_URL;
process.env.EMBED_PUBLIC_WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL;
process.env.EMBED_PUBLIC_EMBED_LIB_URL = process.env.NEXT_PUBLIC_EMBED_LIB_URL;

const viteBaseConfig = {
  envPrefix: "EMBED_PUBLIC_",
};
export default viteBaseConfig;
