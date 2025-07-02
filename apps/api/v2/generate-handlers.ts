import * as fs from "fs";
import * as path from "path";

const handlerTemplate = (endpoint) => `import { VercelRequest, VercelResponse } from '@vercel/node';
import { getServerlessApp } from '../../src/serverless/bootstrap';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getServerlessApp();
    const expressApp = app.getHttpAdapter().getInstance();
    
    req.url = req.url?.replace('/api/v2/${endpoint}', '/v2/${endpoint}') || '/v2/${endpoint}';
    
    return expressApp(req, res);
  } catch (error) {
    console.error('${endpoint} handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
`;

const endpoints = [
  "health",
  "event-types",
  "bookings",
  "oauth-clients",
  "me",
  "schedules",
  "slots",
  "webhooks",
  "organizations",
  "calendars",
  "gcal",
  "provider",
  "conferencing",
  "api-keys",
  "routing-forms",
  "verified-resources",
  "destination-calendars",
  "selected-calendars",
  "atoms",
  "billing",
  "timezones",
  "cal-unified-calendars",
  "router",
  "stripe",
];

const apiDir = path.join(__dirname, "..", "api", "v2");

if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

endpoints.forEach((endpoint) => {
  const filePath = path.join(apiDir, `${endpoint}.ts`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, handlerTemplate(endpoint));
    console.log(`Created handler for ${endpoint}`);
  }
});

console.log("All handlers generated successfully!");
