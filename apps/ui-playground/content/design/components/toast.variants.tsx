"use client";

import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import { RenderComponentWithSnippet } from "@/app/components/render";

export const VariantsExample: React.FC = () => (
  <RenderComponentWithSnippet>
    <div className="space-x-2">
      <Button
        color="primary"
        onClick={() => {
          showToast("This is a success message", "success");
        }}
      >
        Success
      </Button>

      <Button
        color="minimal"
        onClick={() => {
          showToast("This is a warning message", "warning");
        }}
      >
        Warning
      </Button>

      <Button
        color="destructive"
        onClick={() => {
          showToast("This is an error message", "error");
        }}
      >
        Error
      </Button>
    </div>
  </RenderComponentWithSnippet>
);
