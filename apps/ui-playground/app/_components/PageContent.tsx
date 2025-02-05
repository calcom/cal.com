"use client";

import { useEffect, useState } from "react";

import { Button, IconSprites } from "@calcom/ui";

import AlertDemo from "./AlertDemo";
import AvatarDemo from "./AvatarDemo";
import BadgeDemo from "./BadgeDemo";
import ButtonDemo from "./ButtonDemo";
import CheckboxDemo from "./CheckboxDemo";
import DialogDemo from "./DialogDemo";
import DropdownDemo from "./DropdownDemo";
import EmptyScreenDemo from "./EmptyScreenDemo";
import FormDemo from "./FormDemo";
import InputDemo from "./InputDemo";
import NavigationItemDemo from "./NavigationItemDemo";
import RadioDemo from "./RadioDemo";
import RangeSliderDemo from "./RangeSliderDemo";
import RangeSliderPopoverDemo from "./RangeSliderPopoverDemo";
import SelectDemo from "./SelectDemo";
import TableOfContents from "./TableOfContents";
import TabsDemo from "./TabsDemo";
import TextFieldDemo from "./TextFieldDemo";
import ToastDemo from "./ToastDemo";

export default function PageContent() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.className = isDark ? "dark" : "light";
  }, [isDark]);

  return (
    <div className="bg-default min-h-screen font-[family-name:var(--font-inter)]">
      <div className="bg-default/80 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl">
          <div className="mx-6 flex items-center justify-end space-x-2 py-4">
            <Button onClick={() => setIsDark(!isDark)}>
              {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </Button>
            {/* <ThemePicker /> */}
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

            <section id="dialog" className="space-y-6">
              <DialogDemo />
            </section>

            <section id="toast" className="space-y-6">
              <ToastDemo />
            </section>

            <section id="select" className="space-y-6">
              <SelectDemo />
            </section>

            <section id="checkbox" className="space-y-6">
              <CheckboxDemo />
            </section>

            <section id="dropdown" className="space-y-6">
              <DropdownDemo />
            </section>

            <section id="alert" className="space-y-6">
              <AlertDemo />
            </section>

            <section id="input" className="space-y-6">
              <InputDemo />
            </section>

            <section id="form" className="space-y-6">
              <FormDemo />
            </section>

            <section id="navigation-item" className="space-y-6">
              <NavigationItemDemo />
            </section>

            <section id="textfield" className="space-y-6">
              <TextFieldDemo />
            </section>

            <section id="range-slider" className="space-y-6">
              <RangeSliderDemo />
            </section>

            <section id="radio" className="space-y-6">
              <RadioDemo />
            </section>

            <section id="range-slider-popover" className="space-y-6">
              <RangeSliderPopoverDemo />
            </section>

            <section id="tabs" className="space-y-6">
              <TabsDemo />
            </section>
            <section id="empty-screen" className="space-y-6">
              <EmptyScreenDemo />
            </section>
          </main>
        </div>
      </div>
      <IconSprites />
    </div>
  );
}
