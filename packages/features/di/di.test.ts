import { createModule } from "@evyweb/ioctopus";
import { describe, expect, it } from "vitest";
import type { ModuleLoader } from "./di";
import { bindModuleToClassOnToken } from "./di";

class SingleDepService {
  constructor(public dep: unknown) {}
}

class MultiDepService {
  constructor(public deps: { logger: unknown; config: unknown }) {}
}

function createMockLoader(token: string): ModuleLoader {
  const loaderModule = createModule();
  loaderModule.bind(token).toValue(`mock-${token}`);
  return {
    token,
    loadModule: (container) => {
      container.load(Symbol.for(`loader-${token}`), loaderModule);
    },
  };
}

describe("bindModuleToClassOnToken", () => {
  it("throws when both dep and depsMap are provided", () => {
    const module = createModule();
    const mockLoader = createMockLoader("logger");

    expect(() =>
      bindModuleToClassOnToken({
        module,
        moduleToken: "test-module",
        token: "service",
        classs: SingleDepService,
        dep: mockLoader,
        depsMap: { dep: mockLoader } as never,
      })
    ).toThrow("Cannot provide both 'dep' and 'depsMap'");
  });

  it("throws when neither dep nor depsMap is provided", () => {
    const module = createModule();

    expect(() =>
      bindModuleToClassOnToken({
        module,
        moduleToken: "test-module",
        token: "service",
        classs: SingleDepService,
      } as never)
    ).toThrow("Must provide either 'dep' for single dependency or 'depsMap' for multiple dependencies.");
  });

  it("returns a loadModule function when dep is provided", () => {
    const module = createModule();
    const mockLoader = createMockLoader("logger");

    const loadModule = bindModuleToClassOnToken({
      module,
      moduleToken: "test-module",
      token: "service",
      classs: SingleDepService,
      dep: mockLoader,
    });

    expect(typeof loadModule).toBe("function");
  });

  it("returns a loadModule function when depsMap is provided", () => {
    const module = createModule();
    const loggerLoader = createMockLoader("logger");
    const configLoader = createMockLoader("config");

    const loadModule = bindModuleToClassOnToken({
      module,
      moduleToken: "test-module",
      token: "service",
      classs: MultiDepService,
      depsMap: { logger: loggerLoader, config: configLoader },
    });

    expect(typeof loadModule).toBe("function");
  });
});
