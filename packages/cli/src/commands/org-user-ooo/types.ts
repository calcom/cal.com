import type {
  CreateOutOfOfficeEntryDto,
  UpdateOutOfOfficeEntryDto,
  UserOooOutputDto,
  UserOooOutputResponseDto,
  UserOoosOutputResponseDto,
} from "../../generated/types.gen";

export type { CreateOutOfOfficeEntryDto, UpdateOutOfOfficeEntryDto };

export type OrgUserOooEntry = UserOooOutputDto;
export type OrgUserOooListResponse = UserOoosOutputResponseDto;
export type OrgUserOooSingleResponse = UserOooOutputResponseDto;

export const VALID_REASONS = ["unspecified", "vacation", "travel", "sick", "public_holiday"] as const;
export type OooReason = (typeof VALID_REASONS)[number];
