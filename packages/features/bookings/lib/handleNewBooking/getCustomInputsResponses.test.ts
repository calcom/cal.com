import { describe, expect, it } from "vitest";
import { getCustomInputsResponses } from "./getCustomInputsResponses";

describe("getCustomInputsResponses", () => {
  describe("when reqBody has customInputs", () => {
    it("maps customInputs array to a label-value record", () => {
      const reqBody = {
        customInputs: [
          { label: "Company Name", value: "Acme Corp" },
          { label: "Notes", value: "Please call ahead" },
        ],
      };

      const result = getCustomInputsResponses(reqBody, []);

      expect(result).toEqual({
        "Company Name": "Acme Corp",
        Notes: "Please call ahead",
      });
    });

    it("handles boolean custom input values", () => {
      const reqBody = {
        customInputs: [{ label: "Agree to Terms", value: true }],
      };

      const result = getCustomInputsResponses(reqBody, []);

      expect(result).toEqual({ "Agree to Terms": true });
    });
  });

  describe("when reqBody has responses (new format)", () => {
    it("maps responses to custom input labels via slugified matching", () => {
      const reqBody = {
        responses: {
          "company-name": { value: "Acme Corp" },
        },
      };
      const eventTypeCustomInputs = [
        {
          id: 1,
          eventTypeId: 1,
          label: "Company Name",
          type: "TEXT",
          required: true,
          placeholder: "",
          options: null,
          hasToBeCreated: true,
        },
      ];

      const result = getCustomInputsResponses(
        reqBody,
        eventTypeCustomInputs as Parameters<typeof getCustomInputsResponses>[1]
      );

      expect(result).toEqual({
        "Company Name": { value: "Acme Corp" },
      });
    });

    it("ignores responses that do not match any custom input", () => {
      const reqBody = {
        responses: {
          "unknown-field": { value: "ignored" },
        },
      };
      const eventTypeCustomInputs = [
        {
          id: 1,
          eventTypeId: 1,
          label: "Company Name",
          type: "TEXT",
          required: true,
          placeholder: "",
          options: null,
          hasToBeCreated: true,
        },
      ];

      const result = getCustomInputsResponses(
        reqBody,
        eventTypeCustomInputs as Parameters<typeof getCustomInputsResponses>[1]
      );

      expect(result).toEqual({});
    });
  });

  describe("when reqBody has neither customInputs nor responses", () => {
    it("returns an empty object", () => {
      const result = getCustomInputsResponses({}, []);
      expect(result).toEqual({});
    });
  });

  describe("when customInputs is empty array", () => {
    it("falls back to responses mapping", () => {
      const reqBody = {
        customInputs: [],
        responses: {
          notes: { value: "test" },
        },
      };
      const eventTypeCustomInputs = [
        {
          id: 1,
          eventTypeId: 1,
          label: "Notes",
          type: "TEXTLONG",
          required: false,
          placeholder: "",
          options: null,
          hasToBeCreated: true,
        },
      ];

      const result = getCustomInputsResponses(
        reqBody,
        eventTypeCustomInputs as Parameters<typeof getCustomInputsResponses>[1]
      );

      expect(result).toEqual({ Notes: { value: "test" } });
    });
  });
});
