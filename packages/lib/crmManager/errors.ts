export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
  }
}
