import type { Container, Module } from "@evyweb/ioctopus";
import { createContainer, createModule } from "@evyweb/ioctopus";

/**
 * A type-safe alternative to module.bind(token).toClass(classs, deps) that automatically ensures that all dependencies required by the Class are provided.
 * It assumes that dependencies are stored under the `deps` property of the Class, which is a good convention to follow anyway
 *
 * @returns A function that can be used to load the dependencies into the container automatically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bindModuleToClassOnToken<TClass extends new (...args: any[]) => any>({
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
    keyof InstanceType<TClass>["deps"],
    { token: string | symbol; loadModule: (container: Container) => void }
  >;
}) {
  const depsObject = Object.fromEntries(Object.entries(depsMap).map(([key, value]) => [key, value.token]));
  module.bind(token).toClass(classs, depsObject);

  return function loadModule(container: Container) {
    container.load(moduleToken, module);
    for (const key in depsMap) {
      const loadModule = depsMap[key as keyof typeof depsMap].loadModule;
      loadModule(container);
    }
  };
}
export { createContainer, createModule, type Container, type Module };
