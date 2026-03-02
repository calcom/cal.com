import { describe, expect, it } from "vitest";

import { agentSchema, phoneNumberFormSchema } from "./schemas";

describe("agentSchema", () => {
  it("accepts valid minimal agent data", () => {
    const result = agentSchema.safeParse({
      generalPrompt: "You are a helpful booking assistant",
      beginMessage: "Hello! How can I help you today?",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty generalPrompt", () => {
    const result = agentSchema.safeParse({
      generalPrompt: "",
      beginMessage: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty beginMessage", () => {
    const result = agentSchema.safeParse({
      generalPrompt: "Prompt",
      beginMessage: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing generalPrompt", () => {
    const result = agentSchema.safeParse({
      beginMessage: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing beginMessage", () => {
    const result = agentSchema.safeParse({
      generalPrompt: "Prompt",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = agentSchema.safeParse({
      generalPrompt: "Prompt",
      beginMessage: "Hello",
      numberToCall: "+14155551234",
      language: "en-US",
      voiceId: "voice-123",
      outboundEventTypeId: 42,
    });
    expect(result.success).toBe(true);
  });

  it("accepts generalTools array", () => {
    const result = agentSchema.safeParse({
      generalPrompt: "Prompt",
      beginMessage: "Hello",
      generalTools: [
        {
          type: "end_call",
          name: "end_call",
          description: "Ends the call",
          cal_api_key: null,
          event_type_id: null,
          timezone: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts generalTools with booking tool", () => {
    const result = agentSchema.safeParse({
      generalPrompt: "Prompt",
      beginMessage: "Hello",
      generalTools: [
        {
          type: "booking",
          name: "book_meeting",
          description: "Books a meeting",
          cal_api_key: "cal_live_abc123",
          event_type_id: 42,
          timezone: "America/New_York",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty generalTools array", () => {
    const result = agentSchema.safeParse({
      generalPrompt: "Prompt",
      beginMessage: "Hello",
      generalTools: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("phoneNumberFormSchema", () => {
  it("accepts valid phone number with termination URI", () => {
    const result = phoneNumberFormSchema.safeParse({
      phoneNumber: "+14155551234",
      terminationUri: "sip:calcom@sip.provider.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid phone number", () => {
    const result = phoneNumberFormSchema.safeParse({
      phoneNumber: "not-a-phone",
      terminationUri: "sip:calcom@sip.provider.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty terminationUri", () => {
    const result = phoneNumberFormSchema.safeParse({
      phoneNumber: "+14155551234",
      terminationUri: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing terminationUri", () => {
    const result = phoneNumberFormSchema.safeParse({
      phoneNumber: "+14155551234",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional SIP auth fields", () => {
    const result = phoneNumberFormSchema.safeParse({
      phoneNumber: "+14155551234",
      terminationUri: "sip:calcom@sip.provider.com",
      sipTrunkAuthUsername: "user",
      sipTrunkAuthPassword: "pass",
      nickname: "Main Line",
    });
    expect(result.success).toBe(true);
  });

  it("accepts international phone numbers", () => {
    const result = phoneNumberFormSchema.safeParse({
      phoneNumber: "+442071234567",
      terminationUri: "sip:calcom@sip.provider.com",
    });
    expect(result.success).toBe(true);
  });
});
