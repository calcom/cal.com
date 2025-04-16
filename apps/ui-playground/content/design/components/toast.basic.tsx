"use client";

import { RenderComponentWithSnippet } from "@/app/components/render";
import { useState } from "react";

import { Button } from "@calcom/ui/components/button";
import { ErrorToast, showToast, SuccessToast, WarningToast } from "@calcom/ui/components/toast";

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

export const RawToastComponents = () => {
  const [toastVisible, setToastVisible] = useState(true);
  const toastId = "123";
  const onClose = () => {
    setToastVisible(false);
  };

  const handleReplay = () => {
    setToastVisible(true);
  };

  return (
    <RenderComponentWithSnippet>
      <div className="space-y-4">
        <Button onClick={handleReplay} disabled={toastVisible}>
          Replay Toasts
        </Button>
        <div className="flex flex-col gap-2">
          <SuccessToast
            message="This is a basic toast message"
            toastVisible={toastVisible}
            toastId={toastId}
            onClose={onClose}
          />
          <ErrorToast
            message="This is an error toast message"
            toastVisible={toastVisible}
            toastId={toastId}
            onClose={onClose}
          />
          <WarningToast
            message="This is a warning toast message"
            toastVisible={toastVisible}
            toastId={toastId}
            onClose={onClose}
          />
        </div>
      </div>
    </RenderComponentWithSnippet>
  );
};
