import { z } from "zod";

export const ComponentTextSize = z.enum(["S", "M", "L"]);
export type ComponentTextSize = z.infer<typeof ComponentTextSize>;

export const ComponentTextColor = z.enum(["NORMAL", "MUTED", "SUCCESS", "WARNING", "ERROR"]);
export type ComponentTextColor = z.infer<typeof ComponentTextColor>;

export const ComponentSpacerSize = z.enum(["XS", "S", "M", "L", "XL"]);
export type ComponentSpacerSize = z.infer<typeof ComponentSpacerSize>;

export const ComponentDividerSpacingSize = z.enum(["XS", "S", "M", "L", "XL"]);
export type ComponentDividerSpacingSize = z.infer<typeof ComponentDividerSpacingSize>;

export const ComponentBadgeColor = z.enum(["GREY", "GREEN", "YELLOW", "RED", "BLUE"]);
export type ComponentBadgeColor = z.infer<typeof ComponentBadgeColor>;

const Text = z.object({
  textSize: ComponentTextSize.nullish(),
  textColor: ComponentTextColor.nullish(),
  text: z.string().min(1).max(5000),
});

const Divider = z.object({
  dividerSpacingSize: ComponentDividerSpacingSize.nullish(),
});

const LinkButton = z.object({
  linkButtonUrl: z.string().url(),
  linkButtonLabel: z.string().max(500),
});

const Spacer = z.object({
  spacerSize: ComponentSpacerSize,
});

const Badge = z.object({
  badgeLabel: z.string().max(500),
  badgeColor: ComponentBadgeColor.nullish(),
});

const CopyButton = z.object({
  copyButtonValue: z.string().max(1000),
  copyButtonTooltipLabel: z.string().max(500).nullish(),
});

const RowContentUnionInput = z.object({
  componentText: Text.optional(),
  componentDivider: Divider.optional(),
  componentLinkButton: LinkButton.optional(),
  componentSpacer: Spacer.optional(),
  componentBadge: Badge.optional(),
  componentCopyButton: CopyButton.optional(),
});

const Row = z.object({
  rowMainContent: z.array(RowContentUnionInput),
  rowAsideContent: z.array(RowContentUnionInput),
});

const ContainerContentUnionInput = z.object({
  componentText: Text.optional(),
  componentDivider: Divider.optional(),
  componentLinkButton: LinkButton.optional(),
  componentSpacer: Spacer.optional(),
  componentBadge: Badge.optional(),
  componentCopyButton: CopyButton.optional(),
  componentRow: Row.optional(),
});

const Container = z.object({
  containerContent: z.array(ContainerContentUnionInput).min(1),
});

export const CardComponent = z.object({
  componentText: Text.optional(),
  componentDivider: Divider.optional(),
  componentLinkButton: LinkButton.optional(),
  componentSpacer: Spacer.optional(),
  componentBadge: Badge.optional(),
  componentCopyButton: CopyButton.optional(),
  componentRow: Row.optional(),
  componentContainer: Container.optional(),
});

export type CardComponent = z.infer<typeof CardComponent>;
