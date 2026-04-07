#!/usr/bin/env node
/**
 * Local webhook smoke test (same HMAC Cal.com uses).
 * Usage: CAL_WEBHOOK_SECRET=test-secret node scripts/send-test-webhook.mjs [baseUrl]
 * Default baseUrl: http://127.0.0.1:3000
 */
import crypto from "node:crypto";

const secret = process.env.CAL_WEBHOOK_SECRET || "test-secret";
const base = process.argv[2] || "http://127.0.0.1:3000";
const start = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

const bodyObj = {
  triggerEvent: "BOOKING_CREATED",
  createdAt: new Date().toISOString(),
  payload: {
    uid: `test-${Date.now()}`,
    type: "30 Min Meeting",
    startTime: start,
    organizer: { name: "Test Host", email: "host@example.com" },
    attendees: [
      {
        name: "Test Guest",
        email: "guest@example.com",
        timeZone: "America/New_York",
      },
    ],
    responses: { notes: { value: "Quick sync on the roadmap." } },
  },
};

const body = JSON.stringify(bodyObj);
const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");

const res = await fetch(`${base.replace(/\/$/, "")}/webhook/cal`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Cal-Signature-256": sig,
  },
  body,
});

console.log("Status:", res.status, await res.text());
