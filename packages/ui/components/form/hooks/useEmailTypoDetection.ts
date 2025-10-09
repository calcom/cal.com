import { run } from "@zootools/email-spell-checker";
import { useEffect, useState } from "react";

export function useEmailTypoDetection(email: string) {
  const [suggestion, setSuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!email || !email.includes("@")) {
      setSuggestion(null);
      return;
    }

    try {
      const result = run({ email });
      // The library returns { address: string, full: string } or null
      // 'full' contains the corrected email suggestion
      if (result && result.full && result.full !== email) {
        setSuggestion(result.full);
      } else {
        setSuggestion(null);
      }
    } catch (error) {
      console.error("Email typo detection error:", error);
      setSuggestion(null);
    }
  }, [email]);

  return suggestion;
}
