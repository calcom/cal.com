import { AttendeeVerifyEmail } from "@calcom/platform-libraries/emails";
import type { User } from "@calcom/prisma/client";
import { INestApplication } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { TOTP as TOTPtoMock } from "@otplib/core";
import { totp } from "otplib";
import request from "supertest";
import { ApiKeysRepositoryFixture } from "test/fixtures/repository/api-keys.repository.fixture";
import { UserRepositoryFixture } from "test/fixtures/repository/users.repository.fixture";
import { VerifiedResourcesRepositoryFixtures } from "test/fixtures/repository/verified-resources.repository.fixture";
import { randomString } from "test/utils/randomString";
import { AppModule } from "@/app.module";
import { bootstrap } from "@/bootstrap";
import { PrismaModule } from "@/modules/prisma/prisma.module";
import { TokensModule } from "@/modules/tokens/tokens.module";
import { UsersModule } from "@/modules/users/users.module";
import { RequestEmailVerificationInput } from "@/modules/verified-resources/inputs/request-email-verification.input";
import { VerifyEmailInput } from "@/modules/verified-resources/inputs/verify-email.input";
import {
  UserVerifiedEmailOutput,
  UserVerifiedEmailsOutput,
} from "@/modules/verified-resources/outputs/verified-email.output";
import {
  UserVerifiedPhoneOutput,
  UserVerifiedPhonesOutput,
} from "@/modules/verified-resources/outputs/verified-phone.output";

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

describe("UserVerifiedResourcesController (e2e)", () => {
  let app: INestApplication;

  let userRepositoryFixture: UserRepositoryFixture;
  let apiKeysRepositoryFixture: ApiKeysRepositoryFixture;
  let verifiedResourcesRepositoryFixtures: VerifiedResourcesRepositoryFixtures;

  let user: User;
  let apiKeyString: string;
  let verifiedEmailId: number;
  let verifiedPhoneId: number;
  const emailToVerify = `user-e2e-verified-resources-${randomString()}@example.com`;
  const phoneToVerify = "+37255551234";
  const authEmail = `users-verified-resources-e2e-${randomString()}@api.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, PrismaModule, UsersModule, TokensModule],
    }).compile();

    userRepositoryFixture = new UserRepositoryFixture(moduleRef);
    apiKeysRepositoryFixture = new ApiKeysRepositoryFixture(moduleRef);
    verifiedResourcesRepositoryFixtures = new VerifiedResourcesRepositoryFixtures(moduleRef);

    user = await userRepositoryFixture.create({
      email: authEmail,
      username: authEmail,
    });

    const { keyString } = await apiKeysRepositoryFixture.createApiKey(user.id, null);
    apiKeyString = keyString;

    verifiedPhoneId = (
      await verifiedResourcesRepositoryFixtures.createPhone({
        phoneNumber: phoneToVerify,
        user: { connect: { id: user.id } },
      })
    ).id;

    app = moduleRef.createNestApplication();
    bootstrap(app as NestExpressApplication);
    await app.init();
  });

  it("should trigger email verification code", async () => {
    return request(app.getHttpServer())
      .post("/v2/verified-resources/emails/verification-code/request")
      .send({ email: emailToVerify } satisfies RequestEmailVerificationInput)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200);
  });

  it("should verify email", async () => {
    return request(app.getHttpServer())
      .post("/v2/verified-resources/emails/verification-code/verify")
      .send({ email: emailToVerify, code: "1234" } satisfies VerifyEmailInput)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as UserVerifiedEmailOutput;
        verifiedEmailId = response.data.id;
        expect(response.data.email).toEqual(emailToVerify);
        expect(response.data.userId).toEqual(user.id);
      });
  });

  it("should fetch verified email by id", async () => {
    return request(app.getHttpServer())
      .get(`/v2/verified-resources/emails/${verifiedEmailId}`)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as UserVerifiedEmailOutput;
        expect(response.data.email).toEqual(emailToVerify);
        expect(response.data.userId).toEqual(user.id);
      });
  });

  it("should fetch verified number by id", async () => {
    return request(app.getHttpServer())
      .get(`/v2/verified-resources/phones/${verifiedPhoneId}`)
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as UserVerifiedPhoneOutput;
        expect(response.data.phoneNumber).toEqual(phoneToVerify);
        expect(response.data.userId).toEqual(user.id);
      });
  });

  it("should fetch verified emails", async () => {
    return request(app.getHttpServer())
      .get("/v2/verified-resources/emails")
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as UserVerifiedEmailsOutput;
        expect(response.data.find((verifiedEmail) => verifiedEmail.email === emailToVerify)).toBeDefined();
        expect(response.data.find((verifiedEmail) => verifiedEmail.userId === user.id)).toBeDefined();
      });
  });

  it("should fetch verified phones", async () => {
    return request(app.getHttpServer())
      .get("/v2/verified-resources/phones")
      .set({ Authorization: `Bearer cal_test_${apiKeyString}` })
      .expect(200)
      .then((res) => {
        const response = res.body as UserVerifiedPhonesOutput;
        expect(
          response.data.find((verifiedPhone) => verifiedPhone.phoneNumber === phoneToVerify)
        ).toBeDefined();
        expect(response.data.find((verifiedPhone) => verifiedPhone.userId === user.id)).toBeDefined();
      });
  });

  it("should return 401 without auth header", async () => {
    return request(app.getHttpServer()).get("/v2/verified-resources/emails").expect(401);
  });

  afterAll(async () => {
    await verifiedResourcesRepositoryFixtures.deleteEmailById(verifiedEmailId);
    await verifiedResourcesRepositoryFixtures.deletePhoneById(verifiedPhoneId);
    await userRepositoryFixture.deleteByEmail(user.email);
    await app.close();
  });
});
