import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const plain = randomBytes(32).toString("hex");
const hashed = createHash("sha256").update(plain).digest("hex");

const outputPath = path.join(__dirname, "..", ".generated-secrets");
const content = `plain - ${plain}\nhashed - ${hashed}\n`;

fs.writeFileSync(outputPath, content);

process.stdout.write(`Secrets written to: ${outputPath}\n`);
