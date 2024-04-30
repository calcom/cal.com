"use client";
import { Loader } from "lucide-react";
import { type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export const ButtonSubmit = ({className, children, ...props}: { children: ReactNode; className?: string } & ButtonProps) => {
  const status = useFormStatus();
  return (
    <>
      <Button
        type="submit"
        variant="secondary"
        disabled={status.pending}
        className={cn("w-48 font-normal", className)}
        {...props}
      >
        {status.pending ? (
          <div className="flex w-full flex-row justify-evenly">
            <Loader
              className="h-5 w-5 animate-spin stroke-offset-foreground/25"
              // 1s feels a bit fast
              style={{ animationDuration: "2s" }}
            />
          </div>
        ) : (
          children
        )}
      </Button>
    </>
  );
};
