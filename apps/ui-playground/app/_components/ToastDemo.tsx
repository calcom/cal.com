"use client";

import { useState } from "react";

import { Button } from "@calcom/ui";
import { showToast, SuccessToast, ErrorToast, WarningToast } from "@calcom/ui";

import DemoSection, { DemoSubSection } from "./DemoSection";

export default function ToastDemo() {
  const variants = ["success", "warning", "error"] as const;
  const positions = [
    "top-left",
    "top-center",
    "top-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ] as const;

  const [demoToastId] = useState("demo-toast");

  const handleShowToast = (variant: (typeof variants)[number], position?: (typeof positions)[number]) => {
    showToast(`This is a ${variant} toast message`, variant, {
      position: position || "bottom-center",
    });
  };

  const dummyCloseHandler = () => {
    // Dummy close handler for demo toasts
  };

  return (
    <DemoSection title="Toast">
      {/* Toast Components */}
      <DemoSubSection id="toast-components" title="Toast Components">
        <div className="flex flex-col gap-4">
          <SuccessToast
            message="This is a success toast message"
            toastVisible={true}
            toastId={demoToastId}
            onClose={dummyCloseHandler}
          />
          <WarningToast
            message="This is a warning toast message"
            toastVisible={true}
            toastId={demoToastId}
            onClose={dummyCloseHandler}
          />
          <ErrorToast
            message="This is an error toast message"
            toastVisible={true}
            toastId={demoToastId}
            onClose={dummyCloseHandler}
          />
        </div>
      </DemoSubSection>

      {/* Interactive Variants */}
      <DemoSubSection id="toast-variants" title="Interactive Variants">
        <div className="flex flex-wrap items-center gap-4">
          {variants.map((variant) => (
            <div key={variant} className="flex flex-col items-center gap-2">
              <Button color="secondary" onClick={() => handleShowToast(variant)}>
                Show {variant} toast
              </Button>
              <span className="text-subtle text-xs capitalize">{variant}</span>
            </div>
          ))}
        </div>
      </DemoSubSection>

      {/* Positions */}
      <DemoSubSection id="toast-positions" title="Positions">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {positions.map((position) => (
            <div key={position} className="flex flex-col items-center gap-2">
              <Button color="secondary" onClick={() => handleShowToast("success", position)}>
                {position}
              </Button>
              <span className="text-subtle text-xs">{position}</span>
            </div>
          ))}
        </div>
      </DemoSubSection>

      {/* Custom Duration */}
      <DemoSubSection id="toast-duration" title="Custom Duration">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <Button
              color="secondary"
              onClick={() =>
                showToast("This toast will disappear in 2 seconds", "success", {
                  duration: 2000,
                })
              }>
              2 seconds duration
            </Button>
            <span className="text-subtle text-xs">Short</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              color="secondary"
              onClick={() =>
                showToast("This toast will disappear in 10 seconds", "success", {
                  duration: 10000,
                })
              }>
              10 seconds duration
            </Button>
            <span className="text-subtle text-xs">Long</span>
          </div>
        </div>
      </DemoSubSection>
    </DemoSection>
  );
}
