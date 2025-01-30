"use client";

import { useState } from "react";

import { Button } from "@calcom/ui";

import AvatarDemo from "./AvatarDemo";
import BadgeDemo from "./BadgeDemo";
import ButtonDemo from "./ButtonDemo";
import TableOfContents from "./TableOfContents";

export default function PageContent() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div
      className={`min-h-screen ${isDark ? "dark" : ""} bg-default font-[family-name:var(--font-geist-sans)]`}>
      <div className="bg-default/80 sticky top-0 z-50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="mx-6 flex justify-end py-4">
            <Button onClick={() => setIsDark(!isDark)}>
              {isDark ? "Light Mode" : "Dark Mode (colours not final)"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 overflow-y-auto">
              <TableOfContents />
            </div>
          </div>

          {/* Main content */}
          <main className="space-y-6">
            <section id="avatar" className="space-y-6">
              <AvatarDemo />
            </section>
            <section id="badge" className="space-y-6">
              <BadgeDemo />
            </section>
            <section id="button" className="space-y-6">
              <ButtonDemo />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
