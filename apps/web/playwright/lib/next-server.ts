import { createServer, Server } from "http";
import next from "next";
import path from "path";
import { parse } from "url";

export const nextServer = async ({ port = 3000 } = { port: 3000 }) => {
  const dev = process.env.PLAYWRIGHT_USE_NEXTJS_DEV_SERVER === "1" ? true : false;
  console.log("Starting Next Server", { dev });
  const app = next({
    dev: dev,
    dir: path.resolve(__dirname, "../../"),
  });
  await app.prepare();
  const handle = app.getRequestHandler();
  // start next server on arbitrary port
  const server: Server = await new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (!req.url) {
        throw new Error("URL not present");
      }
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
    server.listen({ port: port }, () => {
      resolve(server);
    });
    server.on("error", (error) => {
      if (error) throw new Error("Could not start Next.js server -" + error.message);
    });
  });
  return server;
};
