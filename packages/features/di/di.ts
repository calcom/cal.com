import type { Container, Module } from "@evyweb/ioctopus";
import { createContainer, createModule } from "@evyweb/ioctopus";

export type ModuleLoader = { token: string | symbol; loadModule: (container: Container) => void };

/**
 * A type-safe alternative to module.bind(token).toClass(classs, deps) that automatically ensures that all dependencies required by the Class are provided.
 * It assumes that dependencies are passed to the constructor as an object map(e.g. new MyService(deps))
 *
 * @returns A function that can be used to load the dependencies into the container automatically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bindModuleToClassOnToken<TClass extends new (deps: any) => any>({
  module,
  token,
  classs,
  depsMap,
  moduleToken,
}: {
  module: Module;
  moduleToken: string | symbol;
  token: string | symbol;
  classs: TClass;
  depsMap: Record<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyof (TClass extends new (deps: infer TDeps) => any ? TDeps : never),
    ModuleLoader
  >;
}): (container: Container) => void;

/**
 * A type-safe alternative to module.bind(token).toClass(classs, deps) that automatically ensures that all dependencies required by the Class are provided.
 * It assumes that there is a single dependency, passed as argument to the constructor
 *
 * @returns A function that can be used to load the dependencies into the container automatically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bindModuleToClassOnToken<TClass extends new (deps: any) => any>({
  module,
  token,
  classs,
  dep,
  moduleToken,
}: {
  module: Module;
  moduleToken: string | symbol;
  token: string | symbol;
  classs: TClass;
  dep: ModuleLoader;
}): (container: Container) => void;

/**
 * A type-safe alternative to module.bind(token).toClass(classs, deps) that automatically ensures that all dependencies required by the Class are provided.
 * @returns A function that can be used to load the dependencies into the container automatically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bindModuleToClassOnToken<TClass extends new (deps: any) => any>({
  module,
  token,
  classs,
  depsMap,
  dep,
  moduleToken,
}: {
  module: Module;
  moduleToken: string | symbol;
  token: string | symbol;
  classs: TClass;
  /**
   * When the constructor of the class accept deps as the argument which is a Record of many dependencies
   */
  depsMap?: Record<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keyof (TClass extends new (deps: infer TDeps) => any ? TDeps : never),
    ModuleLoader
  >;
  /**
   * When the constructor of the class accept a single dependency and is the only argument to constructor.
   */
  dep?: ModuleLoader;
}) {
  if (dep && depsMap) {
    throw new Error(
      "Cannot provide both 'dep' and 'depsMap'. Use 'dep' for single dependency or 'depsMap' for multiple dependencies."
    );
  }

  if (!dep && !depsMap) {
    throw new Error(
      "Must provide either 'dep' for single dependency or 'depsMap' for multiple dependencies."
    );
  }

  if (dep) {
    module.bind(token).toClass(classs, [dep.token]);
  } else if (depsMap) {
    const depsObject = Object.fromEntries(Object.entries(depsMap).map(([key, value]) => [key, value.token]));
    module.bind(token).toClass(classs, depsObject);
  }

  return function loadModule(container: Container) {
    container.load(moduleToken, module);

    if (dep) {
      dep.loadModule(container);
    } else if (depsMap) {
      for (const key in depsMap) {
        const loadModule = depsMap[key as keyof typeof depsMap].loadModule;
        loadModule(container);
      }
    }
  };
}
export { createContainer, createModule, type Container, type Module };
