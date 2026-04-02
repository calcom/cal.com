import { CanActivate, ExecutionContext } from "@nestjs/common";
import { Or } from "./or.guard";

// Mock guards for testing
class MockGuard1 implements CanActivate {
  constructor(private shouldPass: boolean) {}

  async canActivate(): Promise<boolean> {
    return this.shouldPass;
  }
}

class MockGuard2 implements CanActivate {
  constructor(private shouldPass: boolean) {}

  async canActivate(): Promise<boolean> {
    return this.shouldPass;
  }
}

class MockGuard3 implements CanActivate {
  constructor(private shouldThrow: boolean = false) {}

  async canActivate(): Promise<boolean> {
    if (this.shouldThrow) {
      throw new Error("Guard failed");
    }
    return false;
  }
}

describe("OrGuard", () => {
  let guard: InstanceType<ReturnType<typeof Or>>;
  let mockExecutionContext: ExecutionContext;
  let mockModuleRef: any;

  beforeEach(() => {
    mockModuleRef = {
      get: jest.fn(),
    };

    const OrGuardClass = Or([MockGuard1, MockGuard2]);
    guard = new OrGuardClass(mockModuleRef);
    mockExecutionContext = {} as ExecutionContext;
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  it("should grant access when first guard passes", async () => {
    const mockGuard1 = new MockGuard1(true);
    const mockGuard2 = new MockGuard2(false);

    mockModuleRef.get.mockReturnValueOnce(mockGuard1).mockReturnValueOnce(mockGuard2);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it("should grant access when second guard passes", async () => {
    const mockGuard1 = new MockGuard1(false);
    const mockGuard2 = new MockGuard2(true);

    mockModuleRef.get.mockReturnValueOnce(mockGuard1).mockReturnValueOnce(mockGuard2);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it("should deny access when all guards fail", async () => {
    const mockGuard1 = new MockGuard1(false);
    const mockGuard2 = new MockGuard2(false);

    mockModuleRef.get.mockReturnValueOnce(mockGuard1).mockReturnValueOnce(mockGuard2);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(false);
  });

  it("should continue checking other guards when one throws an error", async () => {
    const mockGuard1 = new MockGuard3(true); // throws error
    const mockGuard2 = new MockGuard2(true); // passes

    mockModuleRef.get.mockReturnValueOnce(mockGuard1).mockReturnValueOnce(mockGuard2);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });
});

describe("Or decorator", () => {
  it("should create a guard class with the specified guards", () => {
    const OrGuardClass = Or([MockGuard1, MockGuard2]);

    expect(OrGuardClass).toBeDefined();
    expect(typeof OrGuardClass).toBe("function");
  });
});
