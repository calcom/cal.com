import { useEffect, useState } from "react";

import EmbedSnippet from "../embed-snippet";

export default function useEmbed() {
  const embedUrl = "http://localhost:3001/dist/embed.es.js";
  const [Cal, setCal] = useState(null);
  useEffect(() => {
    const Cal = EmbedSnippet(embedUrl);
    setCal(() => {
      return Cal;
    });
  }, []);
  return Cal;
}
