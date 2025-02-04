"use client";

import { ColorPicker } from "@/app/_components/ThemePicker/ColorPicker";
import { SpacingPicker } from "@/app/_components/ThemePicker/SpacingPicker";
import { useEffect, useState } from "react";

import { Button, Dialog, DialogContent, DialogHeader, DialogTrigger } from "@calcom/ui";

import { RadiusPicker } from "./ThemePicker/RadiusPicker";

export default function ThemePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [savedTheme, setSavedTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cal-theme");
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [previewTheme, setPreviewTheme] = useState(savedTheme);

  // Apply preview theme
  useEffect(() => {
    if (Object.keys(previewTheme).length > 0) {
      Object.entries(previewTheme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value as string);
      });
    }
  }, [previewTheme]);

  // Reset preview when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPreviewTheme(savedTheme);
    }
  }, [isOpen, savedTheme]);

  const handleSave = () => {
    localStorage.setItem("cal-theme", JSON.stringify(previewTheme));
    setSavedTheme(previewTheme);
    setIsOpen(false);
  };

  const handleReset = () => {
    const emptyTheme = {};
    localStorage.setItem("cal-theme", JSON.stringify(emptyTheme));
    setSavedTheme(emptyTheme);
    setPreviewTheme(emptyTheme);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="icon" className="ml-2">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Customize Theme" subtitle="Adjust colors, spacing, and border radius" />
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-emphasis font-medium">Colors</h3>
            <ColorPicker
              value={previewTheme}
              onChange={(colorUpdates) => setPreviewTheme((prev) => ({ ...prev, ...colorUpdates }))}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-emphasis font-medium">Spacing</h3>
            <SpacingPicker
              value={previewTheme}
              onChange={(spacingUpdates) => setPreviewTheme((prev) => ({ ...prev, ...spacingUpdates }))}
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-emphasis font-medium">Border Radius</h3>
            <RadiusPicker
              value={previewTheme}
              onChange={(radiusUpdates) => setPreviewTheme((prev) => ({ ...prev, ...radiusUpdates }))}
            />
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <Button color="secondary" onClick={handleReset}>
              Reset to Default
            </Button>
            <Button onClick={handleSave}>Save Theme</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
