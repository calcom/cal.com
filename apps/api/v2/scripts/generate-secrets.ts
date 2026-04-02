import fs from "node:fs";
import path from "node:path";
import { generateSecret } from "@calcom/platform-libraries";

const [hashed, plain] = generateSecret();

const outputPath = path.join(__dirname, "..", ".generated-secrets");
const content = `plain - ${plain}\nhashed - ${hashed}\n`;

fs.writeFileSync(outputPath, content);

process.stdout.write(`Secrets written to: ${outputPath}\n`);
