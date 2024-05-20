// signatureMiddleware.ts
import type { InternalAxiosRequestConfig } from "axios";
import axios from "axios";
import crypto, { randomBytes } from "crypto";

const generateNonce = (length = 16): string => {
  return randomBytes(length).toString("hex");
};

interface RequestConfig {
  body?: unknown;
  headers: Record<string, string>;
}

export const createSignatureMiddleware = () => {
  return async (requestConfig: RequestConfig): Promise<InternalAxiosRequestConfig> => {
    const body = requestConfig.body ? JSON.stringify(requestConfig.body) : "";
    const nonce = generateNonce(); // Generate a secure nonce
    const secretKey = process.env.CAL_SIGNATURE_TOKEN ?? "";

    const generatedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(body + nonce)
      .digest("hex");

    requestConfig.headers = {
      ...requestConfig.headers,
      Nonce: nonce,
      Signature: generatedSignature,
    };

    return requestConfig as InternalAxiosRequestConfig;
  };
};

const signatureMiddleware = createSignatureMiddleware();

const privateApiAxios = axios.create();

privateApiAxios.interceptors.request.use(
  async (config) => {
    return await signatureMiddleware({
      ...config,
      body: config.data,
      headers: config.headers || {},
    });
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default privateApiAxios;
