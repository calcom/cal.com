import type {
  CreateOutOfOfficeEntryDto,
  MeOutput,
  UpdateOutOfOfficeEntryDto,
} from "../../generated/types.gen";

export type { CreateOutOfOfficeEntryDto, MeOutput, UpdateOutOfOfficeEntryDto };

export interface OooEntry {
  id: number;
  uuid: string;
  userId: number;
  toUserId?: number;
  start: string;
  end: string;
  notes?: string;
  reason?: string;
}

export const VALID_REASONS = ["unspecified", "vacation", "travel", "sick", "public_holiday"] as const;
export type OooReason = (typeof VALID_REASONS)[number];
