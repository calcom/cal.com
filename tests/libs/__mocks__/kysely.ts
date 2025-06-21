import { beforeEach, vi } from "vitest";

const createMockQueryBuilder = () => {
  let mockData: any[] = [];
  
  return {
    selectFrom: () => ({
      innerJoin: () => ({
        select: () => ({
          where: () => ({
            where: () => ({
              execute: async () => mockData
            })
          })
        })
      })
    }),
    __setMockData: (data: any[]) => {
      mockData.length = 0;
      mockData.push(...data);
    }
  };
};

const mockKysely = createMockQueryBuilder();

vi.mock("@calcom/kysely", () => ({
  default: mockKysely,
}));

beforeEach(() => {
  mockKysely.__setMockData([]);
});

export default mockKysely;
