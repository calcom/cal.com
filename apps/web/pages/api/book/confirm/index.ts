import { defaultHandler } from "~/common";

export default defaultHandler({
  PATCH: import("./_patch"),
});
