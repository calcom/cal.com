import type { IconProps } from "@coss/ui/icons";

type IconComponent = (props: IconProps) => JSX.Element;

/**
 * Configuration entry for a source type.
 * Keys in SOURCES_CONFIG follow the pattern:
 * - `${type}_${subType}` when source has subType (e.g., "workflow_sms", "workflow_calai")
 * - `${type}` when source has no subType (e.g., "location", "default")
 * @see getSourceConfigKey for key construction logic
 * @see fieldSourceSchema in zod-utils.ts for source type definition
 */
type SourceConfigEntry = {
  icon?: IconComponent;
  displayLabel: string;
  bookerInfo?: { message: string };
};

/**
 * UI properties derived at read-time, not stored in DB.
 *
 * Keys are constructed using the pattern `type_subType`:
 * - For sources with subType: `workflow_sms` (from type="workflow", subType="sms")
 * - For sources without subType: `location` (from type="location")
 *
 * The key construction logic is in getSourceConfigKey().
 * @see FieldSource type in zod-utils.ts for source structure
 */
const SOURCES_CONFIG = {
  workflow_sms: {
    displayLabel: "workflow_sms_source_label",
    bookerInfo: {
      message: "sms_workflow_consent",
    },
  },
  workflow_calai: {
    displayLabel: "workflow_calai_source_label",
    bookerInfo: {
      message: "calai_workflow_consent",
    },
  },
  location: {
    displayLabel: "location_source_label",
  },
  default: {
    displayLabel: "default",
  },
} satisfies Record<string, SourceConfigEntry>;

/**
 * Valid source configuration keys.
 * Keys follow the pattern: type_subType (e.g., "workflow_sms") or just type (e.g., "location")
 * @see getSourceConfigKey for key construction
 */
export type SourceTypeKey = keyof typeof SOURCES_CONFIG;

export function getSourceConfigKey(source: { type: string; subType?: string }): SourceTypeKey {
  const key = source.subType ? `${source.type}_${source.subType}` : source.type;
  return (key in SOURCES_CONFIG ? key : "default") as SourceTypeKey;
}

export function getSourceConfig(source: { type: string; subType?: string }): SourceConfigEntry {
  const key = getSourceConfigKey(source);
  return SOURCES_CONFIG[key];
}

/** @deprecated Use getSourceConfig directly instead. */
export function getStaticConfig() {
  return {
    sourceConfig: getSourceConfig,
  };
}
