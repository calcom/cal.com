// We are not using withEmbedSsr here because page.tsx already has the logic to append /embed to the redirect URL and it ends up as /embed/embed if we use withEmbedSsr here
// TODO: We should use withEmbedSsr here and remove the logic from page.tsx
export { default } from "./page";
