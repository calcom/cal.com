import type {
  CreatePrivateLinkOutput,
  DeletePrivateLinkOutput,
  GetPrivateLinksOutput,
  TimeBasedPrivateLinkOutput,
  UpdatePrivateLinkOutput,
  UsageBasedPrivateLinkOutput,
} from "../../generated/types.gen";

export type PrivateLink = TimeBasedPrivateLinkOutput | UsageBasedPrivateLinkOutput;
export type PrivateLinkList = GetPrivateLinksOutput["data"];
export type PrivateLinkCreated = CreatePrivateLinkOutput["data"];
export type PrivateLinkUpdated = UpdatePrivateLinkOutput["data"];

export type { DeletePrivateLinkOutput, TimeBasedPrivateLinkOutput, UsageBasedPrivateLinkOutput };
