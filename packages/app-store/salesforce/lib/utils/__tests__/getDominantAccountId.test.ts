import { describe, expect, it } from "vitest";
import getDominantAccountId from "../getDominantAccountId";

describe("getDominantAccountId", () => {
  it("should return the dominant account ID", () => {
    const accounts = [
      { AccountId: "acc001" },
      { AccountId: "acc003" },
      { AccountId: "acc002" },
      { AccountId: "acc003" },
    ];

    const dominantAccountId = getDominantAccountId(accounts);

    expect(dominantAccountId).toEqual("acc003");
  });
});
