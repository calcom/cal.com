import type { FormValues } from "event-type/types";
import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";

import { md } from "@calcom/lib/markdownIt";
import turndown from "@calcom/lib/turndownService";
import { Editor, SkeletonContainer, SkeletonText } from "@calcom/ui";

type DescriptionEditorProps = {
  description?: string | null;
  editable?: boolean;
};

export function DescriptionEditor({ description, editable }: DescriptionEditorProps) {
  const formMethods = useFormContext<FormValues>();
  const [mounted, setIsMounted] = useState<boolean>(false);
  const [firstRender, setFirstRender] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (mounted) {
    return (
      <Editor
        getText={() => md.render(formMethods.getValues("description") || description || "")}
        setText={(value: string) => formMethods.setValue("description", turndown(value))}
        excludedToolbarItems={["blockType"]}
        placeholder="A quick video meeting."
        editable={editable}
        firstRender={firstRender}
        setFirstRender={setFirstRender}
      />
    );
  }

  return (
    <SkeletonContainer>
      <SkeletonText className="block h-24 w-full" />
    </SkeletonContainer>
  );
}
