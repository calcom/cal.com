"use client";

import React, { useEffect, useState, useCallback } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Label, TextArea } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";
import { showToast } from "@calcom/ui/components/toast";

declare global {
  interface Window {
    Support?: {
      open: () => void;
      shouldShowTriggerButton: (showTrigger: boolean) => void;
    };
  }
}

export const IntercomContactForm = () => {
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showTrigger, setShowTrigger] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !window.Support) {
      window.Support = {
        open: () => {
          setIsOpen(true);
        },
        shouldShowTriggerButton: (showTrigger) => {
          setShowTrigger(showTrigger);
        },
      };
      window.dispatchEvent(new Event("support:ready"));
    }

    return () => {
      if (typeof window !== "undefined" && window.Support) {
        delete window.Support;
      }
    };
  }, []);

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

  const contentRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;

      const isSmall = window.innerWidth < 768;

      if (isSmall) {
        setShowTrigger(false);
      }

      const wrapper = node.parentElement;
      if (wrapper?.hasAttribute("data-radix-popper-content-wrapper")) {
        if (!showTrigger) {
          wrapper.style.left = "auto";
          wrapper.style.right = "0px";
          wrapper.style.bottom = "5rem";
          wrapper.style.top = "auto";
        } else {
          wrapper.style.left = "0px";
          wrapper.style.right = "auto";
          wrapper.style.bottom = "auto";
          wrapper.style.top = "0px";
        }
      }
    },
    [showTrigger]
  );

  const resetForm = () => {
    setIsSubmitted(false);
    setMessage("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 **:data-radix-popper-content-wrapper:bottom-4!">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          asChild
          className={classNames("enabled:hover:bg-subtle bg-subtle shadow-none", !showTrigger && "hidden!")}>
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-subtle text-emphasis flex h-12 w-12 items-center justify-center rounded-full border-none">
            <Icon name="message-circle" className="h-6 w-6" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          ref={contentRef}
          style={{ maxWidth: "450px", maxHeight: "650px" }}
          className={classNames(
            "!bg-cal-muted no-scrollbar mb-2 w-screen overflow-hidden overflow-y-scroll px-6 py-4 md:w-[450px]",
            showTrigger ? "mr-8" : "mr-0"
          )}>
          <div className="flex w-full justify-between">
            <p className="mb-5 text-lg font-semibold">{t("contact_support")}</p>
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
                <h4 className="mb-2 text-lg font-medium ">{t("message_sent")}</h4>
                <p className="text-subtle mb-4 text-sm">{t("support_message_sent_description")}</p>
                <Button color="primary" className="my-2" onClick={resetForm} variant="button" size="base">
                  {t("send_another_message")}
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="message">{t("describe_the_issue")}</Label>
                  <TextArea
                    id="message"
                    name="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t("support_message_placeholder")}
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
                          {t("sending")}
                        </div>
                      ) : (
                        <>
                          <Icon name="send" className="mr-2 h-4 w-4" />
                          {t("send_message")}
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
