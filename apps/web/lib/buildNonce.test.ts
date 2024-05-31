import { describe, it, expect } from "vitest";

import { buildNonce } from "./buildNonce";

describe("buildNonce", () => {
  it("should return an empty string for an empty array", () => {
    const nonce = buildNonce(new Uint8Array());

    expect(nonce).toEqual("");
    expect(atob(nonce).length).toEqual(0);
  });

  it("should return a base64 string for values from 0 to 63", () => {
    const array = Array(22)
      .fill(0)
      .map((_, i) => i);
    const nonce = buildNonce(new Uint8Array(array));

    expect(nonce.length).toEqual(24);
    expect(nonce).toEqual("ABCDEFGHIJKLMNOPQRSTQQ==");

    expect(atob(nonce).length).toEqual(16);
  });

  it("should return a base64 string for values from 64 to 127", () => {
    const array = Array(22)
      .fill(0)
      .map((_, i) => i + 64);
    const nonce = buildNonce(new Uint8Array(array));

    expect(nonce.length).toEqual(24);
    expect(nonce).toEqual("ABCDEFGHIJKLMNOPQRSTQQ==");

    expect(atob(nonce).length).toEqual(16);
  });

  it("should return a base64 string for values from 128 to 191", () => {
    const array = Array(22)
      .fill(0)
      .map((_, i) => i + 128);
    const nonce = buildNonce(new Uint8Array(array));

    expect(nonce.length).toEqual(24);
    expect(nonce).toEqual("ABCDEFGHIJKLMNOPQRSTQQ==");

    expect(atob(nonce).length).toEqual(16);
  });

  it("should return a base64 string for values from 192 to 255", () => {
    const array = Array(22)
      .fill(0)
      .map((_, i) => i + 192);
    const nonce = buildNonce(new Uint8Array(array));

    expect(nonce.length).toEqual(24);
    expect(nonce).toEqual("ABCDEFGHIJKLMNOPQRSTQQ==");

    expect(atob(nonce).length).toEqual(16);
  });

  it("should return a base64 string for values from 0 to 42", () => {
    const array = Array(22)
      .fill(0)
      .map((_, i) => 2 * i);
    const nonce = buildNonce(new Uint8Array(array));

    expect(nonce.length).toEqual(24);
    expect(nonce).toEqual("ACEGIKMOQSUWYacegikmgg==");

    expect(atob(nonce).length).toEqual(16);
  });

  it("should return a base64 string for 0 values", () => {
    const array = Array(22)
      .fill(0)
      .map(() => 0);
    const nonce = buildNonce(new Uint8Array(array));

    expect(nonce.length).toEqual(24);
    expect(nonce).toEqual("AAAAAAAAAAAAAAAAAAAAAA==");

    expect(atob(nonce).length).toEqual(16);
  });

  it("should return a base64 string for 0xFF values", () => {
    const array = Array(22)
      .fill(0)
      .map(() => 0xff);
    const nonce = buildNonce(new Uint8Array(array));

    expect(nonce.length).toEqual(24);
    expect(nonce).toEqual("////////////////////ww==");

    expect(atob(nonce).length).toEqual(16);
  });
});
