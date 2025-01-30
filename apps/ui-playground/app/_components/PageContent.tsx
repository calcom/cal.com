"use client";

import { useState } from "react";

import { Button, IconSprites } from "@calcom/ui";

import AvatarDemo from "./AvatarDemo";
import BadgeDemo from "./BadgeDemo";
import ButtonDemo from "./ButtonDemo";
import CheckboxDemo from "./CheckboxDemo";
import DropdownDemo from "./DropdownDemo";
import TableOfContents from "./TableOfContents";

export default function PageContent() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`min-h-screen ${isDark ? "dark" : ""} bg-default font-[family-name:var(--font-inter)]`}>
      <div className="bg-default/80 sticky top-0 z-50 ">
        <div className="mx-auto max-w-7xl">
          <div className="mx-6 flex justify-end py-4">
            <Button onClick={() => setIsDark(!isDark)}>
              {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-0 overflow-y-auto">
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

            <section id="checkbox" className="space-y-6">
              <CheckboxDemo />
            </section>

            <section id="dropdown" className="space-y-6">
              <DropdownDemo />
            </section>
          </main>
        </div>
      </div>
      <IconSprites />
    </div>
  );
}
