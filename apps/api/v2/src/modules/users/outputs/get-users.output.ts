import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { Expose } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsString,
  ValidateNested,
  IsArray,
  IsObject,
  IsOptional,
} from "class-validator";

export class GetUserOutput {
  @IsInt()
  @Expose()
  @ApiProperty({ type: Number, required: true, description: "The ID of the user", example: 1 })
  id!: number;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The username of the user",
    example: "john_doe",
  })
  username!: string | null;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The name of the user",
    example: "John Doe",
  })
  name!: string | null;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    required: true,
    description: "The email of the user",
    example: "john@example.com",
  })
  email!: string;

  @IsDateString()
  @Expose()
  @ApiProperty({
    type: Date,
    nullable: true,
    required: false,
    description: "The date when the email was verified",
    example: "2022-01-01T00:00:00Z",
  })
  emailVerified!: Date | null;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The bio of the user",
    example: "I am a software developer",
  })
  bio!: string | null;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The URL of the user's avatar",
    example: "https://example.com/avatar.jpg",
  })
  avatarUrl!: string | null;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    required: true,
    description: "The time zone of the user",
    example: "America/New_York",
  })
  timeZone!: string;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    required: true,
    description: "The week start day of the user",
    example: "Monday",
  })
  weekStart!: string;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The app theme of the user",
    example: "light",
  })
  appTheme!: string | null;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The theme of the user",
    example: "default",
  })
  theme!: string | null;

  @IsInt()
  @Expose()
  @ApiProperty({
    type: Number,
    nullable: true,
    required: false,
    description: "The ID of the default schedule for the user",
    example: 1,
  })
  defaultScheduleId!: number | null;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The locale of the user",
    example: "en-US",
  })
  locale!: string | null;

  @IsInt()
  @Expose()
  @ApiProperty({
    type: Number,
    nullable: true,
    required: false,
    description: "The time format of the user",
    example: 12,
  })
  timeFormat!: number | null;

  @IsBoolean()
  @Expose()
  @ApiProperty({
    type: Boolean,
    required: true,
    description: "Whether to hide branding for the user",
    example: false,
  })
  hideBranding!: boolean;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The brand color of the user",
    example: "#ffffff",
  })
  brandColor!: string | null;

  @IsString()
  @Expose()
  @ApiProperty({
    type: String,
    nullable: true,
    required: false,
    description: "The dark brand color of the user",
    example: "#000000",
  })
  darkBrandColor!: string | null;

  @IsBoolean()
  @Expose()
  @ApiProperty({
    type: Boolean,
    nullable: true,
    required: false,
    description: "Whether dynamic booking is allowed for the user",
    example: true,
  })
  allowDynamicBooking!: boolean | null;

  @IsDateString()
  @Expose()
  @ApiProperty({
    type: Date,
    required: true,
    description: "The date when the user was created",
    example: "2022-01-01T00:00:00Z",
  })
  createdDate!: Date;

  @IsBoolean()
  @Expose()
  @ApiProperty({
    type: Boolean,
    nullable: true,
    required: false,
    description: "Whether the user is verified",
    example: true,
  })
  verified!: boolean | null;

  @IsInt()
  @Expose()
  @ApiProperty({
    type: Number,
    nullable: true,
    required: false,
    description: "The ID of the user who invited this user",
    example: 1,
  })
  invitedTo!: number | null;

  @ApiPropertyOptional({
    type: Object,
    example: { key: "value" },
  })
  @IsObject()
  @IsOptional()
  @Expose()
  @Transform(
    // note(Lauris): added this transform because without it metadata is removed for some reason
    ({ obj }: { obj: { metadata: Record<string, unknown> | null | undefined } }) => {
      return obj.metadata || undefined;
    }
  )
  metadata?: Record<string, string | boolean | number>;
}

export class GetUsersOutput {
  @ValidateNested()
  @Type(() => GetUserOutput)
  @IsArray()
  @ApiProperty({
    type: [GetUserOutput],
    required: true,
    description: "The list of users",
    example: [{ id: 1, username: "john_doe", name: "John Doe", email: "john@example.com" }],
  })
  users!: GetUserOutput[];
}
