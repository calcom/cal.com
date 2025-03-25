import { Button } from "@calcom/ui/components/button";

import type { Template } from "./types";

export default function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="min-h-16 bg-default border-subtle sticky flex flex-col justify-between gap-4 rounded-md border p-5">
      <div className="flex items-start justify-start">
        <div>
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-md p-1">
            <img className="h-8" alt={template.app} src={`/api/app-store/zapier/${template.icon}`} />
          </div>
        </div>
        <div className="mr-4">
          <div>
            <p className="text-emphasis truncate text-sm font-medium leading-4">{template.app}</p>
            <p className="text-subtle mt-[2px] text-sm">{template.text}</p>
          </div>
        </div>
      </div>
      <div className="hidden w-full sm:block">
        <div className="float-right">
          <Button color="secondary" className=" w-[90px]" target="_blank" href={template.link}>
            Use Zap
          </Button>
        </div>
      </div>
      <div className="mt-2 block w-full sm:hidden">
        <div className="float-right">
          <Button color="secondary" className="w-[90px]" target="_blank" href={template.link}>
            Use Zap
          </Button>
        </div>
      </div>
    </div>
  );
}
