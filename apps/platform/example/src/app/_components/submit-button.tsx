"use client";
import { Loader } from "lucide-react";
import { type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "~/components/ui/button";

export const SubmitButton = (props: { children: ReactNode }) => {
  const status = useFormStatus();
  return (
    <>
      <Button
        type="submit"
        variant="secondary"
        disabled={status.pending}
        className="w-48 font-normal"
      >
        {status.pending ? (
          <div className="flex w-full flex-row justify-evenly">
            <Loader
              className="h-5 w-5 animate-spin stroke-foreground/25"
              // 1s feels a bit fast
              style={{ animationDuration: "2s" }}
            />
            <p>Searching...</p>
          </div>
        ) : (
          props.children
        )}
      </Button>
      {status.data && <p>Data: {JSON.stringify(status.data)}</p>}
      {status.action && <p>the action: {JSON.stringify(status.action)}</p>}
    </>
  );
};
