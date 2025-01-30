"use client";

import { useState } from "react";

import { Button } from "@calcom/ui";

import AvatarDemo from "./AvatarDemo";
import BadgeDemo from "./BadgeDemo";

export default function PageContent() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`min-h-screen ${isDark ? "dark" : ""}`}>
      <div className="space-y-6 p-6 font-[family-name:var(--font-geist-sans)]">
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setIsDark(!isDark)}>{isDark ? "Light Mode" : "Dark Mode"}</Button>
        </div>
        <AvatarDemo />
        <BadgeDemo />
      </div>
    </div>
  );
}
