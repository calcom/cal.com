type Code = 307 | 301;

/**
 * Represents a redirect response.
 */
export class Redirect {
  public readonly code: Code;
  public readonly url: string;

  constructor(code: Code, url: string) {
    this.code = code;
    this.url = url;
  }
}
