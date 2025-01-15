import { RealCSRF } from "./csrf";
import type { ICSRF } from "./csrf.interface";
import { MockCSRF } from "./csrf.mock";

export class CSRF {
  static init(): ICSRF {
    if (process.env.CSRF_SECRET) return new RealCSRF();
    return new MockCSRF();
  }
}
