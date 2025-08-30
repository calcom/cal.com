import isPrismaObj from "./isPrismaObj";

const hasKeyInMetadata = <T extends string>(
  x: { metadata: unknown } | null,
  key: T
): x is { metadata: { [key in T]: string | boolean | number } } =>
  isPrismaObj(x?.metadata) && !!x?.metadata && key in x.metadata;

export default hasKeyInMetadata;
