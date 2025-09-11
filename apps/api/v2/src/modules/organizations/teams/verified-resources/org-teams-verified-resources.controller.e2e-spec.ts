import { bootstrap } from "@/app";
import { AppModule } from "@/app.module";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { RequestEmailVerificationInput } from "@/modules/verified-resources/inputs/request-email-verification.input";
import { VerifyEmailInput } from "@/modules/verified-resources/inputs/verify-email.input";
import {
  TeamVerifiedEmailOutput,
  TeamVerifiedEmailsOutput,
} from "@/modules/verified-resources/outputs/verified-email.output";
import {
  TeamVerifiedPhoneOutput,
  TeamVerifiedPhonesOutput,
} from "@/modules/verified-resources/outputs/verified-phone.output";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { TOTP as TOTPtoMock } from "@otplib/core";
import { totp } from "otplib";
import * as request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { MembershipRepositoryFixture } from "test/fixtures/repository/membership.repository.fixture";
import { OrganizationRepositoryFixture } from "test/fixtures/repository/organization.repository.fixture";
import { ProfileRepositoryFixture } from "test/fixtures/repository/profiles.repository.fixture";
import { TeamRepositoryFixture } from "test/fixtures/repository/team.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { VerifiedResourcesRepositoryFixtures } from "test/fixtures/repository/verified-resources.repository.fixture";
import { randomString } from "test/utils/randomString";

import { AttendeeVerifyEmail } from "@calcom/platform-libraries/emails";
import type { User, Team } from "@calcom/prisma/client";

jest.spyOn(totp, "generate").mockImplementation(function () {
  return "1234";
});

jest.spyOn(TOTPtoMock.prototype, "check").mockImplementation(function () {
  return true;
});

jest
  .spyOn(AttendeeVerifyEmail.prototype as any, "getNodeMailerPayload")
  .mockImplementation(async function () {
    return {
      to: `testnotrealemail@notreal.com`,
      from: `testnotrealemail@notreal.com`,
      subject: "No Subject",
      html: "<html><body>Mocked Email Content</body></html>",
      text: "body",
    };
  });

describe("Organizations Teams Verified Resources", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let organizationsRepositoryFixture: OrganizationRepositoryFixture;
  let verifiedResourcesRepositoryFixtures: VerifiedResourcesRepositoryFixtures;
  let teamsRepositoryFixture: TeamRepositoryFixture;
  let profileRepositoryFixture: ProfileRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let membershipsRepositoryFixture: MembershipRepositoryFixture;

  let org: Team;
  let orgTeam: Team;
  const emailToVerify = `org-team-e2e-verified-resources-${randomString()}@example.com`;
  const phoneToVerify = "+37255556666";
  const authEmail = `organizations-verified-resources-responses-user-${randomString()}@api.com`;
  let user: User;
  let apiKeyString: string;
  let verifiedEmailId: number;
  let verifiedPhoneId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    verifiedResourcesRepositoryFixtures = new VerifiedResourcesRepositoryFixtures(moduleRef);
    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    organizationsRepositoryFixture = new OrganizationRepositoryFixture(moduleRef);
    teamsRepositoryFixture = new TeamRepositoryFixture(moduleRef);
    profileRepositoryFixture = new ProfileRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    membershipsRepositoryFixture = new MembershipRepositoryFixture(moduleRef);

    org = await organizationsRepositoryFixture.create({
      name: `organizations-verified-resources-responses-organization-${randomString()}`,
      isOrganization: true,
    });

    user = await userRepositoryFixture.create({
      email: authEmail,
      username: authEmail,
    });

    const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
    apiKeyString = keyString;

    orgTeam = await teamsRepositoryFixture.create({
      name: `organizations-verified-resources-responses-team-${randomString()}`,
      isOrganization: false,
      parent: { connect: { id: org.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: user.id } },
      team: { connect: { id: org.id } },
    });

    await membershipsRepositoryFixture.create({
      role: "ADMIN",
      user: { connect: { id: user.id } },
      team: { connect: { id: orgTeam.id } },
    });

    await profileRepositoryFixture.create({
      uid: `usr-${user.id}`,
      username: authEmail,
      organization: {
        connect: {
          id: org.id,
        },
      },
      user: {
        connect: {
          id: user.id,
        },
      },
    });

    verifiedPhoneId = (
      await verifiedResourcesRepositoryFixtures.createPhone({
        phoneNumber: phoneToVerify,
        user: { connect: { id: user.id } },
        team: {
          connect: {
            id: orgTeam.id,
          },
        },
      })
    ).id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);

    await app.init();
  });

  it("should trigger email verification code", async () => {
    return request(app.getHttpServer())
      .post(
        `/v2/organizations/${org.id}/teams/${orgTeam.id}/verified-resources/emails/verification-code/request`
      )
      .send({ email: emailToVerify } satisfies RequestEmailVerificationInput)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200);
  });

  it("should verify email", async () => {
    return request(app.getHttpServer())
      .post(
        `/v2/organizations/${org.id}/teams/${orgTeam.id}/verified-resources/emails/verification-code/verify`
      )
      .send({ email: emailToVerify, code: "1234" } satisfies VerifyEmailInput)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as TeamVerifiedEmailOutput;
        verifiedEmailId = response.data.id;
        expect(response.data.email).toEqual(emailToVerify);
        expect(response.data.teamId).toEqual(orgTeam.id);
      });
  });

  it("should fetch verified email by id", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/verified-resources/emails/${verifiedEmailId}`)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as TeamVerifiedEmailOutput;
        expect(response.data.email).toEqual(emailToVerify);
        expect(response.data.teamId).toEqual(orgTeam.id);
      });
  });

  it("should fetch verified number by id", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/verified-resources/phones/${verifiedPhoneId}`)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as TeamVerifiedPhoneOutput;
        expect(response.data.phoneNumber).toEqual(phoneToVerify);
        expect(response.data.teamId).toEqual(orgTeam.id);
      });
  });

  it("should fetch verified emails", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/verified-resources/emails`)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as TeamVerifiedEmailsOutput;
        expect(response.data.find((verifiedEmail) => verifiedEmail.email === emailToVerify)).toBeDefined();
        expect(response.data.find((verifiedEmail) => verifiedEmail.teamId === orgTeam.id)).toBeDefined();
      });
  });

  it("should fetch verified phones", async () => {
    return request(app.getHttpServer())
      .get(`/v2/organizations/${org.id}/teams/${orgTeam.id}/verified-resources/phones`)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as TeamVerifiedPhonesOutput;
        expect(
          response.data.find((verifiedPhone) => verifiedPhone.phoneNumber === phoneToVerify)
        ).toBeDefined();
        expect(response.data.find((verifiedPhone) => verifiedPhone.teamId === orgTeam.id)).toBeDefined();
      });
  });

  afterAll(async () => {
    await verifiedResourcesRepositoryFixtures.deleteEmailById(verifiedEmailId);
    await verifiedResourcesRepositoryFixtures.deletePhoneById(verifiedPhoneId);
    await userRepositoryFixture.deleteByEmail(user.email);
    await organizationsRepositoryFixture.delete(org.id);
    await app.close();
  });
});
