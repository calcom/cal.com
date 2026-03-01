import { describe, expect, it } from "vitest";
import { getCustomInputsResponses } from "./getCustomInputsResponses";

describe("getCustomInputsResponses", () => {
  it("maps customInputs array to label-value record", () => {
    const result = getCustomInputsResponses(
      {
        customInputs: [
          { label: "Company", value: "Acme Corp" },
          { label: "Phone", value: "+1234567890" },
        ],
      },
      []
    );

    expect(result).toEqual({ Company: "Acme Corp", Phone: "+1234567890" });
  });

  it("maps responses to customInputs format using event type custom inputs", () => {
    const eventTypeCustomInputs = [
      { id: 1, eventTypeId: 1, label: "Company Name", type: "TEXT", required: false, placeholder: "" },
    ];

    const result = getCustomInputsResponses(
      { responses: { "company-name": { value: "Acme" } as unknown as object } },
      eventTypeCustomInputs as never
    );

    expect(result).toHaveProperty("Company Name");
  });

  it("returns empty object when no customInputs and no matching responses", () => {
    const result = getCustomInputsResponses({ responses: { unknownField: {} } }, []);
    expect(result).toEqual({});
  });

  it("returns empty object when reqBody has empty customInputs", () => {
    const result = getCustomInputsResponses({ customInputs: [] }, []);
    expect(result).toEqual({});
  });

  it("prefers customInputs over responses when both exist", () => {
    const result = getCustomInputsResponses(
      {
        customInputs: [{ label: "Company", value: "From CustomInputs" }],
        responses: { company: { value: "From Responses" } as unknown as object },
      },
      []
    );

    expect(result).toEqual({ Company: "From CustomInputs" });
  });

  it("handles boolean custom input values", () => {
    const result = getCustomInputsResponses({ customInputs: [{ label: "Agree to Terms", value: true }] }, []);

    expect(result).toEqual({ "Agree to Terms": true });
  });
});
