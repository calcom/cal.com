import type { Server } from "node:http";

import { nextServer } from "../lib/next-server";

type ServerFixture = ReturnType<typeof createServerFixture>;

// creates a servers fixture instance and stores the collection
export const createServersFixture = () => {
  const store = { servers: [] } as { servers: ServerFixture[] };
  return {
    create: async () => {
      const server = await nextServer();
      const serverFixture = createServerFixture(server);
      store.servers.push(serverFixture);
      return serverFixture;
    },
    get: () => store.servers,
    deleteAll: async () => {
      store.servers.forEach((server) => server.delete());
      store.servers = [];
    },
  };
};

// creates the single server fixture
const createServerFixture = (server: Server) => {
  const store = { server };

  return {
    self: async () => store.server,
    delete: async () => store.server.close(),
  };
};
