import { $ } from "execa";

import { lucideIconList } from "../components/icon/icon-list.mjs";

async function main() {
  for (const item of lucideIconList) {
    try {
      await $`npx --yes @sly-cli/sly add lucide-icons ${item} --yes`;
    } catch (err) {
      console.error(err?.stderr);
    }
  }
}

main();
