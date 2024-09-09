export type WithNonceProps<T extends Record<string, unknown>> = T & {
  nonce?: string;
};
