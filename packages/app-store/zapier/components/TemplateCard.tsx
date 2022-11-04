import { Button } from "@calcom/ui/components/button";

import { Template } from "./AppSettings";

export default function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="rounded-md border border-gray-200 p-4 ">
      <div className="flex items-center justify-center">
        <div>
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-md border p-1 ">
            <img className="h-8" alt={template.app} src={`/api/app-store/zapier/${template.icon}`} />
          </div>
        </div>
        <div className="mr-4 ">
          <div>
            <p className="truncate text-sm font-medium text-neutral-900">{template.app}</p>
            <p className="mt-[2px] text-xs text-gray-500 ">{template.text}</p>
          </div>
        </div>
        <div className="ml-auto hidden sm:block">
          <Button color="secondary" className="w-[90px] " target="_blank" href={template.link}>
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
