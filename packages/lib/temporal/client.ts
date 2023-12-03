import { Connection, Client } from "@temporalio/client";

let clientInstance: Client | null = null;

//use a singleton client to avoid creating multiple connections.
export const getClient = async (): Promise<Client> => {
  if (!clientInstance) {
    // Connect to the default Server location
    const connection = await Connection.connect({ address: "localhost:7233" });
    // In production, pass options to configure TLS and other settings:
    // {
    //   address: 'foo.bar.tmprl.cloud',
    //   tls: {}
    // }
    clientInstance = new Client({
      connection,
      namespace: "default",
    });
  }
  return clientInstance;
};
