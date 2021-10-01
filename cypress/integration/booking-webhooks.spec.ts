import { createServer } from "http";

function createWebhookReceiverServer() {
  const requests: unknown[] = [];
  const server = createServer((req, res) => {
    const buffer: unknown[] = [];
    req.on("data", (data) => {
      buffer.push(data);
    });
  });

  // listen on random port
  server.listen(0);
  const port: number = (server.address() as any).port;

  return {
    port,
    close: () => server.close(),
    requests,
  };
}
describe("webhooks", () => {
  // before(() => {
  //   cy.visit("/event-types");
  //   cy.login("pro@example.com", "pro");
  // });
  // beforeEach(() => {
  //   cy.visit("/event-types");
  // });

  it("create webhook and book", async () => {
    const { close, port } = createWebhookReceiverServer();

    await fetch(`http://localhost:${port}`, {
      body: JSON.stringify({
        foo: "bar",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    cy.visit("/");

    close();
  });
});
