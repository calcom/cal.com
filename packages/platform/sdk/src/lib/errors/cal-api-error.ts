export class CalApiError extends Error {
  constructor(public message: string, public statusCode: number) {
    super(message);
    this.name = "CalApiError";
  }
}
