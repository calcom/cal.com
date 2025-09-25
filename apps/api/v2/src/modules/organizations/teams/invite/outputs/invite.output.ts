import { ApiProperty } from "@nestjs/swagger";

export class InviteDataDto {
  @ApiProperty({
    description:
      "Opaque invitation token associated with this team. It can be shared with prospective members; when used via the webapp signup or teams page, it allows the recipient to accept the invitation and join the team/organization.",
    example: "f6a5c8b1d2e34c7f90a1b2c3d4e5f6a5b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
  })
  token!: string;

  @ApiProperty({
    description:
      "Invitation URL constructed for the token. In organization context it points to signup with callback; otherwise it points to the teams page to accept the invite.",
    example: "https://app.cal.com/signup?token=f6a5...&callbackUrl=/getting-started",
  })
  inviteLink!: string;
}

export class CreateInviteOutputDto {
  @ApiProperty({ example: "success" })
  status!: string;

  @ApiProperty({ type: InviteDataDto })
  data!: InviteDataDto;
}


