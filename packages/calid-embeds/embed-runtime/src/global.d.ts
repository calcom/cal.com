/// <reference types="vite/client" />

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.css?inline" {
  const content: string;
  export default content;
}
