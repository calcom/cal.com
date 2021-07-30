import * as crypto from "crypto";

export const encrypt = (data: string, secret: string): string => {
  const cipher = crypto.createCipher("aes-256-cbc", secret);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return encrypted;
};

export const decrypt = (data: string, secret: string): string => {
  const decipher = crypto.createDecipher("aes-256-cbc", secret);
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
