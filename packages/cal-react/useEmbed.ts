import { useEffect, useState } from "react";

export default function useEmbed() {
  const embedUrl = "http://localhost:3000/embed.js";
  const [Cal, setCal] = useState(null);
  useEffect(() => {
    setCal(
      (window.Cal =
        window.Cal ||
        function Cal() {
          if (!Cal.loaded) {
            Cal.ns = {};
            Cal.q = Cal.q || [];
            // TODO: Remove import once embed.js is built using some build tool.
            import(/* @vite-ignore */ embedUrl).then(function () {
              window.promise = Promise.resolve();
            });
            Cal.loaded = true;
          }

          if (arguments[0] === "init") {
            const api = function () {
              api.q.push(arguments);
            };
            const namespace = arguments[1];
            api.q = api.q || [];
            namespace ? (Cal.ns[namespace] = api) : null;
            return;
          }
          Cal.q.push(arguments);
          return Cal;
        })
    );
  }, []);
  return Cal;
}
