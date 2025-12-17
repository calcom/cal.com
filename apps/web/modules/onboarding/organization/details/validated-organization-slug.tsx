"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import { cn } from "@coss/ui/lib/utils";
import { LoaderIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { checkSlugAvailability } from "./action/check-slug-availability";

type ValidationState = "idle" | "checking" | "available" | "taken";

type ValidatedOrganizationSlugProps = {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
};

export function ValidatedOrganizationSlug({
  value,
  onChange,
  onValidationChange,
}: ValidatedOrganizationSlugProps) {
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [_isPending, startTransition] = useTransition();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const validateSlug = useCallback(
    (slug: string) => {
      if (!slug || slug.trim() === "") {
        setValidationState("idle");
        setErrorMessage("");
        onValidationChange?.(false);
        return;
      }

      setValidationState("checking");

      // Call server action
      checkSlugAvailability(slug).then((result) => {
        startTransition(() => {
          if (result.available) {
            setValidationState("available");
            setErrorMessage("");
            onValidationChange?.(true);
          } else {
            setValidationState("taken");
            setErrorMessage(result.message || "This slug is not available");
            onValidationChange?.(false);
          }
        });
      });
    },
    [onValidationChange]
  );

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      validateSlug(value);
    }, 500);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, validateSlug]);

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Label className="text-emphasis mb-0 text-sm font-medium leading-4">Organization link</Label>
      <InputGroup className={cn(validationState === "taken" && "border-destructive")}>
        <InputGroupInput value={value} onChange={(e) => onChange(e.target.value)} placeholder="acme" />
        <InputGroupAddon align="inline-end">
          <div className="flex items-center gap-2">
            {validationState === "checking" && <LoaderIcon className="text-subtle h-3 w-3 animate-spin" />}
            <InputGroupText className="text-muted-foreground text-sm">.cal.com</InputGroupText>
          </div>
        </InputGroupAddon>
      </InputGroup>
      {validationState === "taken" && <p className="text-error text-sm">{errorMessage}</p>}
    </div>
  );
}
