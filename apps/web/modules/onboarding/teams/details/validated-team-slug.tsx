"use client";

import { LoaderIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import slugify from "@calcom/lib/slugify";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@coss/ui/components/input-group";
import { Label } from "@coss/ui/components/label";
import { cn } from "@coss/ui/lib/utils";

import { checkTeamSlugAvailability } from "./action/check-team-slug-availability";

type ValidationState = "idle" | "checking" | "available" | "taken";

type ValidatedTeamSlugProps = {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
};

export function ValidatedTeamSlug({ value, onChange, onValidationChange }: ValidatedTeamSlugProps) {
  const { t } = useLocale();
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

      const checkAvailability = async () => {
        const result = await checkTeamSlugAvailability(slug);

        if (result.available) {
          setValidationState("available");
          setErrorMessage("");
          onValidationChange?.(true);
        } else {
          setValidationState("taken");
          setErrorMessage(result.message || "This slug is not available");
          onValidationChange?.(false);
        }
      };

      startTransition(() => {
        checkAvailability();
      });
    },
    [onValidationChange]
  );

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      validateSlug(value);
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, validateSlug]);

  const handleBlur = () => {
    if (value) {
      const slugified = slugify(value);
      if (slugified !== value) {
        onChange(slugified);
      }
    }
  };

  const urlPrefix = `${WEBAPP_URL}/team/`;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <Label className="text-emphasis mb-0 text-sm font-medium leading-4">{t("team_url")}</Label>
      <InputGroup className={cn(validationState === "taken" && "border-destructive")}>
        <InputGroupAddon align="inline-start">
          <InputGroupText className="text-muted-foreground text-sm">{urlPrefix}</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="acme"
        />
        {validationState === "checking" && (
          <InputGroupAddon align="inline-end">
            <LoaderIcon className="text-subtle h-3 w-3 animate-spin" />
          </InputGroupAddon>
        )}
      </InputGroup>
      {validationState === "taken" && <p className="text-error text-sm">{errorMessage}</p>}
    </div>
  );
}
