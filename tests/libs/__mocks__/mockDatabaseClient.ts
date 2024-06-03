import prismock from "./prisma";

export default class MockDatabaseClient {
  async writeCredentialToMockDb(credential) {
    await prismock.credential.create({
      data: credential,
    });
  }
}
