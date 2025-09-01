"use client";

import React, { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Label, TextArea } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";
import { showToast } from "@calcom/ui/components/toast";

declare global {
  interface Window {
    Support?: {
      open: () => void;
    };
  }
}

export const IntercomContactForm = () => {
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      showToast(t("success"), "success");
      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("something_went_wrong");
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof window !== "undefined" && !window.Support) {
    window.Support = {
      open() {
        setIsOpen(true);
      },
    };
  }

  const resetForm = () => {
    setIsSubmitted(false);
    setMessage("");
  };

  return (
    <div className="fixed bottom-[1rem] right-[1rem] z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild className="enabled:hover:bg-subtle bg-subtle shadow-none">
          <Button
            onClick={() => setIsOpen(false)}
            className="bg-subtle text-emphasis flex h-12 w-12 items-center justify-center rounded-full border-none">
            <Icon name="message-circle" className="h-6 w-6" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          style={{ maxWidth: "450px", maxHeight: "650px" }}
          className="!bg-muted no-scrollbar mb-2 mr-8 w-[450px] overflow-hidden overflow-y-scroll px-6 py-4">
          <div className="flex w-full justify-between">
            <p className="mb-5 text-lg font-semibold">Contact support</p>
            <Button
              color="minimal"
              variant="button"
              StartIcon="x"
              size="sm"
              onClick={() => setIsOpen(false)}
            />
          </div>

          <div>
            {isSubmitted ? (
              <div className="py-4 text-center">
                <h4 className="mb-2 text-lg font-medium ">Message Sent</h4>
                <p className="text-subtle mb-4 text-sm">
                  Thank you for contacting us. We&apos;ll get back to you as soon as possible.
                </p>
                <Button color="primary" className="my-2" onClick={resetForm} variant="button" size="base">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="message">Describe the issue</Label>
                  <TextArea
                    id="message"
                    name="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Please describe the issue you're facing, e.g. 'Busy slots are marked available', ..., etc."
                    required
                    rows={4}
                  />
                </div>

                <div className="mt-4 flex w-full items-center">
                  <Button
                    color="secondary"
                    variant="button"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full">
                    <div className="flex w-full justify-center">
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <Icon name="loader" className="mr-2 h-4 w-4 animate-spin rounded-full" />
                          Sending
                        </div>
                      ) : (
                        <>
                          <Icon name="send" className="mr-2 h-4 w-4" />
                          Send Message
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
