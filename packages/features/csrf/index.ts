import { RealCSRF } from "./csrf";
import type { ICSRF } from "./csrf.interface";
import { MockCSRF } from "./csrf.mock";

export class CSRF {
  static init(): ICSRF {
    if (process.env.NEXTAUTH_SECRET) return new RealCSRF();
    return new MockCSRF();
  }
}
