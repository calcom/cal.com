import { useEffect, useState } from "react";

import EmbedSnippet from "../embed-snippet";

export default function useEmbed() {
  const embedUrl = "http://localhost:3001/dist/embed.es.js";
  const [globalCal, setGlobalCal] = useState<ReturnType<typeof EmbedSnippet>>();
  useEffect(() => {
    setGlobalCal(() => {
      return EmbedSnippet(embedUrl);
    });
  }, []);
  return globalCal;
}
