"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";

import { Button, showToast } from "@calcom/ui";

export const BasicExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-x-2">
      <Button
        onClick={() => {
          showToast("This is a basic toast message", "success");
        }}>
        Show Toast
      </Button>

      <Button
        onClick={() => {
          showToast("This toast will disappear in 2 seconds", "success", { duration: 2000 });
        }}>
        Custom Duration
      </Button>

      <Button
        onClick={() => {
          showToast("This toast will persist until dismissed", "success", { duration: Infinity });
        }}>
        Persistent Toast
      </Button>
    </div>
  </RenderComponentWithSnippet>
);
