import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const encryptionAlgo = "aes-256-ctr";

export const encrypt = (text: string): { hash: string; initVector: string } => {
  const secret = process.env.ENCRYPTION_KEY || "";

  const initVector = randomBytes(16);
  const cipher = createCipheriv(encryptionAlgo, secret, initVector);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return {
    hash: encrypted.toString("hex"),
    initVector: initVector.toString("hex"),
  };
};

export const decrypt = (content: string, initVector: string): string => {
  const secret = process.env.ENCRYPTION_KEY || "";

  const decipher = createDecipheriv(encryptionAlgo, secret, Buffer.from(initVector, "hex"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(content, "hex")), decipher.final()]);

  return decrypted.toString();
};
