import { describe, expect, it } from "vitest";
import { getSourceConfig, getSourceConfigKey, getStaticConfig } from "./staticConfig";

describe("getSourceConfigKey", () => {
  it("should return 'workflow_sms' for workflow source with sms subType", () => {
    expect(getSourceConfigKey({ type: "workflow", subType: "sms" })).toBe("workflow_sms");
  });

  it("should return 'workflow_calai' for workflow source with calai subType", () => {
    expect(getSourceConfigKey({ type: "workflow", subType: "calai" })).toBe("workflow_calai");
  });

  it("should return 'location' for location source without subType", () => {
    expect(getSourceConfigKey({ type: "location" })).toBe("location");
  });

  it("should return 'default' for default source without subType", () => {
    expect(getSourceConfigKey({ type: "default" })).toBe("default");
  });

  it("should return 'default' for unknown source type", () => {
    expect(getSourceConfigKey({ type: "unknown" })).toBe("default");
  });

  it("should return 'default' for unknown type_subType combination", () => {
    expect(getSourceConfigKey({ type: "custom", subType: "xyz" })).toBe("default");
  });

  it("should return 'default' for workflow source with unknown subType", () => {
    expect(getSourceConfigKey({ type: "workflow", subType: "unknown" })).toBe("default");
  });

  it("should handle source with undefined subType same as no subType", () => {
    expect(getSourceConfigKey({ type: "location", subType: undefined })).toBe("location");
  });
});

describe("getSourceConfig", () => {
  it("should return workflow_sms config with sms consent message", () => {
    const config = getSourceConfig({ type: "workflow", subType: "sms" });
    expect(config.displayLabel).toBe("workflow_sms_source_label");
    expect(config.bookerInfo?.message).toBe("sms_workflow_consent");
    expect(config.icon).toBeUndefined();
  });

  it("should return workflow_calai config with no icon and calai consent message", () => {
    const config = getSourceConfig({ type: "workflow", subType: "calai" });
    expect(config.displayLabel).toBe("workflow_calai_source_label");
    expect(config.bookerInfo?.message).toBe("calai_workflow_consent");
    expect(config.icon).toBeUndefined();
  });

  it("should return location config with no icon and no bookerInfo", () => {
    const config = getSourceConfig({ type: "location" });
    expect(config.displayLabel).toBe("location_source_label");
    expect(config.bookerInfo).toBeUndefined();
    expect(config.icon).toBeUndefined();
  });

  it("should return default config with no icon and no bookerInfo", () => {
    const config = getSourceConfig({ type: "default" });
    expect(config.displayLabel).toBe("default");
    expect(config.bookerInfo).toBeUndefined();
    expect(config.icon).toBeUndefined();
  });

  it("should return default config for unknown source type", () => {
    const config = getSourceConfig({ type: "unknown_type" });
    expect(config.displayLabel).toBe("default");
    expect(config.icon).toBeUndefined();
  });
});

describe("getStaticConfig", () => {
  it("should return an object with sourceConfig function", () => {
    const staticConfig = getStaticConfig();
    expect(typeof staticConfig.sourceConfig).toBe("function");
  });

  it("should return sourceConfig that delegates to getSourceConfig", () => {
    const { sourceConfig } = getStaticConfig();
    const result = sourceConfig({ type: "workflow", subType: "sms" });
    expect(result.displayLabel).toBe("workflow_sms_source_label");
  });
});
