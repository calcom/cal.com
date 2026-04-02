import type { Server } from "node:http";
import { createServer } from "node:http";
import { parse } from "node:url";
import detect from "detect-port";
import next from "next";

// eslint-disable-next-line @typescript-eslint/no-namespace
declare let process: {
  env: {
    E2E_DEV_SERVER: string;
    PLAYWRIGHT_TEST_BASE_URL: string;
    NEXT_PUBLIC_WEBAPP_URL: string;
    NEXT_PUBLIC_WEBSITE_URL: string;
  };
};

export const nextServer = async ({ port = 3000 } = { port: 3000 }) => {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const dev = process.env.E2E_DEV_SERVER === "1" ? true : false;
  if (dev) {
    port = await detect(Math.round((1 + Math.random()) * 3000));
  }
  process.env.PLAYWRIGHT_TEST_BASE_URL =
    process.env.NEXT_PUBLIC_WEBAPP_URL =
    process.env.NEXT_PUBLIC_WEBSITE_URL =
      `http://localhost:${port}`;
  const app = next({
    dev: dev,
    port,
    hostname: "localhost",
  });
  console.log("Started Next Server", { dev, port });

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
      if (error) throw new Error(`Could not start Next.js server - ${error.message}`);
    });
  });
  return server;
};
