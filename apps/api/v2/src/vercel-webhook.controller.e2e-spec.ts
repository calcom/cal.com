import * as crypto from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";

describe("Vercel Webhook Controller (e2e)", () => {
  let app: INestApplication;
  const WEBHOOK_SECRET = "test-webhook-secret";
  const TRIGGER_VERSION = "test-version-123";
  const TRIGGER_SECRET_KEY = "test-trigger-secret-key";

  beforeAll(async () => {
    // biome-ignore lint/style/noProcessEnv: Test setup requires setting environment variables
    process.env.VERCEL_PROMOTE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    // biome-ignore lint/style/noProcessEnv: Test setup requires setting environment variables
    process.env.TRIGGER_VERSION = TRIGGER_VERSION;
    // biome-ignore lint/style/noProcessEnv: Test setup requires setting environment variables
    process.env.TRIGGER_SECRET_KEY = TRIGGER_SECRET_KEY;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule],
    }).compile();

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  afterAll(async () => {
    // biome-ignore lint/style/noProcessEnv: Test cleanup requires deleting environment variables
    delete process.env.VERCEL_PROMOTE_WEBHOOK_SECRET;
    // biome-ignore lint/style/noProcessEnv: Test cleanup requires deleting environment variables
    delete process.env.TRIGGER_VERSION;
    // biome-ignore lint/style/noProcessEnv: Test cleanup requires deleting environment variables
    delete process.env.TRIGGER_SECRET_KEY;
    await app.close();
  });

  function generateSignature(body: string): string {
    // Compute signature from the exact raw bytes that will be sent
    return crypto.createHmac("sha1", WEBHOOK_SECRET).update(body).digest("hex");
  }

  describe("POST /webhooks/vercel/deployment-promoted", () => {
    it("should reject requests without x-vercel-signature header", async () => {
      const body = JSON.stringify({ type: "deployment.promoted" });

      await request(app.getHttpServer())
        .post("/v2/webhooks/vercel/deployment-promoted")
        .set("Content-Type", "application/json")
        .send(body)
        .expect(401);
    });

    it("should reject requests with invalid signature", async () => {
      const body = JSON.stringify({ type: "deployment.promoted" });

      await request(app.getHttpServer())
        .post("/v2/webhooks/vercel/deployment-promoted")
        .set("Content-Type", "application/json")
        .set("x-vercel-signature", "invalid-signature")
        .send(body)
        .expect(401);
    });

    it("should ignore non-deployment.promoted events with valid signature", async () => {
      const body = JSON.stringify({ type: "deployment.created" });
      const signature = generateSignature(body);

      const response = await request(app.getHttpServer())
        .post("/v2/webhooks/vercel/deployment-promoted")
        .set("Content-Type", "application/json")
        .set("x-vercel-signature", signature)
        .send(body)
        .expect(200);

      expect(response.body.status).toBe("ignored");
      expect(response.body.version).toBe("");
    });

    it("should process deployment.promoted events with valid signature", async () => {
      const body = JSON.stringify({ type: "deployment.promoted" });
      const signature = generateSignature(body);

      const originalFetch = global.fetch;
      let fetchCalled = false;
      let fetchUrl = "";
      let fetchOptions: RequestInit | undefined;

      global.fetch = jest.fn().mockImplementation((url: string, options?: RequestInit) => {
        fetchCalled = true;
        fetchUrl = url;
        fetchOptions = options;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(""),
        });
      });

      try {
        const response = await request(app.getHttpServer())
          .post("/v2/webhooks/vercel/deployment-promoted")
          .set("Content-Type", "application/json")
          .set("x-vercel-signature", signature)
          .send(body)
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(response.body.version).toBe(TRIGGER_VERSION);
        expect(fetchCalled).toBe(true);
        expect(fetchUrl).toBe(`https://api.trigger.dev/api/v1/deployments/${TRIGGER_VERSION}/promote`);
        expect(fetchOptions?.method).toBe("POST");
        expect(fetchOptions?.headers).toEqual(
          expect.objectContaining({
            Authorization: `Bearer ${TRIGGER_SECRET_KEY}`,
          })
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should retry on trigger.dev API failure", async () => {
      const body = JSON.stringify({ type: "deployment.promoted" });
      const signature = generateSignature(body);

      const originalFetch = global.fetch;
      let fetchCallCount = 0;

      global.fetch = jest.fn().mockImplementation(() => {
        fetchCallCount++;
        if (fetchCallCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve("Internal Server Error"),
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(""),
        });
      });

      try {
        const response = await request(app.getHttpServer())
          .post("/v2/webhooks/vercel/deployment-promoted")
          .set("Content-Type", "application/json")
          .set("x-vercel-signature", signature)
          .send(body)
          .expect(200);

        expect(response.body.status).toBe("success");
        expect(fetchCallCount).toBe(3);
      } finally {
        global.fetch = originalFetch;
      }
    }, 30000);
  });
});
