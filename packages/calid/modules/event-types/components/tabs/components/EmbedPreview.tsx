import { Eye } from "lucide-react";
import React from "react";

import type { EmbedSettings } from "../hooks/useEmbedSettings";

interface EmbedPreviewProps {
  embedType: string;
  embedSettings: EmbedSettings;
  embedUrl: string;
  eventType?: any;
}

export const EmbedPreview: React.FC<EmbedPreviewProps> = ({
  embedType,
  embedSettings,
  embedUrl,
  eventType,
}) => {
  const renderPreview = () => {
    switch (embedType) {
      case "inline":
        return (
          <div className="flex h-80 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <div className="text-center">
              <div className="bg-primary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg">
                <Eye className="text-primary-foreground h-8 w-8" />
              </div>
              <p className="text-sm text-gray-600">Inline Calendar Preview</p>
              <p className="mt-1 text-xs text-gray-400">
                Theme: {embedSettings.theme} | Layout: {embedSettings.layout}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Size: {embedSettings.windowWidth}% × {embedSettings.windowHeight}%
              </p>
            </div>
          </div>
        );

      case "floating-popup":
        return (
          <div className="relative h-80 w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <div
              className={`absolute ${embedSettings.position.includes("bottom") ? "bottom-4" : "top-4"} ${
                embedSettings.position.includes("right") ? "right-4" : "left-4"
              }`}>
              <button
                className="rounded-lg px-4 py-2 text-sm font-medium shadow-lg"
                style={{
                  backgroundColor: `#${embedSettings.buttonColor}`,
                  color: `#${embedSettings.textColor}`,
                }}>
                {embedSettings.displayCalendarIcon && "📅 "}
                {embedSettings.buttonText}
              </button>
            </div>
            <div className="absolute left-4 top-4">
              <p className="text-xs text-gray-500">Floating Button Preview</p>
              <p className="text-xs text-gray-400">Position: {embedSettings.position}</p>
            </div>
          </div>
        );

      case "element-click":
        return (
          <div className="flex h-80 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <div className="text-center">
              <button className="bg-primary text-primary-foreground mb-4 rounded-lg px-6 py-3 text-sm font-medium">
                {embedSettings.buttonText}
              </button>
              <p className="text-sm text-gray-600">Element Click Trigger Preview</p>
              <p className="mt-1 text-xs text-gray-400">Click element to open calendar</p>
            </div>
          </div>
        );

      case "email":
        // MANUAL: Implement email preview based on your email template requirements
        return (
          <div className="flex h-80 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <div className="text-center">
              <a
                href="#"
                className="mb-4 inline-block rounded-lg px-6 py-3 text-sm font-medium"
                style={{
                  backgroundColor: `#${embedSettings.buttonColor}`,
                  color: `#${embedSettings.textColor}`,
                  textDecoration: "none",
                }}>
                {embedSettings.buttonText}
              </a>
              <p className="text-sm text-gray-600">Email Button Preview</p>
              <p className="mt-1 text-xs text-gray-400">{eventType?.title || "Event Type"}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <div className="bg-primary rounded-lg border p-4">{renderPreview()}</div>;
};
