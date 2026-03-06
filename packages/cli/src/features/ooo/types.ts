import type {
  CreateOutOfOfficeEntryDto,
  MeOutput,
  UpdateOutOfOfficeEntryDto,
  UserOooOutputDto,
  UserOooOutputResponseDto,
  UserOoosOutputResponseDto,
} from "../../generated/types.gen";

export type { CreateOutOfOfficeEntryDto, MeOutput, UpdateOutOfOfficeEntryDto };

export type OooEntry = UserOooOutputDto;
export type OooListResponse = UserOoosOutputResponseDto;
export type OooSingleResponse = UserOooOutputResponseDto;

export const VALID_REASONS = ["unspecified", "vacation", "travel", "sick", "public_holiday"] as const;
export type OooReason = (typeof VALID_REASONS)[number];
