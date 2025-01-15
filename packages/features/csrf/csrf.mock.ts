import type { ICSRF } from "./csrf.interface";

export class MockCSRF implements ICSRF {
  setup() {
    console.info("Skipping CSRF setup");
  }
  verify() {
    console.info("Skipping CSRF verification");
  }
}
