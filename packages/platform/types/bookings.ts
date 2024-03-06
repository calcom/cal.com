import { ValidateNested, IsNumber, Min, Max, IsString, IsOptional } from "class-validator";

enum Status {
  upcoming = "upcoming",
  recurring = "recurring",
  past = "past",
  cancelled = "cancelled",
  unconfirmed = "unconfirmed",
}

export class GetBookingsInput {
  @ValidateNested({ each: true })
  filters!: {
    teamsIds?: number[];
    userIds?: number[];
    status: Status;
    eventTypeIds?: number[];
  };

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number | null;

  @IsNumber()
  @IsOptional()
  cursor?: number | null;
}

export class GetBookingInput {
  @IsString()
  uid!: string;
}
