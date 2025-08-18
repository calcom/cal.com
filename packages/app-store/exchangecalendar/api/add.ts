import { defaultHandler } from "../../../../lib/server/defaultHandler.js";

export default defaultHandler({
  GET: import("./_getAdd"),
  POST: import("./_postAdd"),
});
