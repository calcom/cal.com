import prismock from "./prisma";

export default class MockDatabaseClient {
  public async writeCredential(credential) {
    await prismock.credential.create({
      data: credential,
    });
  }

  public async getCredential(credentialId) {
    return await prismock.credential.findFirst({
      where: {
        id: credentialId,
      },
    });
  }

  public async writeApp(appData: {
    slug: string;
    categories: string[];
    keys: any;
    dirName: string;
    enabled: boolean;
  }) {
    await prismock.app.create({
      data: {
        ...appData,
      },
    });
  }

  public async getEventTypes(eventTypeIds) {
    return await prismock.eventType.findMany({
      where: {
        id: {
          in: eventTypeIds,
        },
      },
    });
  }
}
