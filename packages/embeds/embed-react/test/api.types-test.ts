import { getCalApi } from "@calcom/embed-react";

const api = getCalApi();

api.then((api) => {
  api("on", {
    action: "*",
    callback: (e) => {
      console.log(e.detail);
    },
  });
});
