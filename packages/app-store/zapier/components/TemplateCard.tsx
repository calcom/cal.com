import { Template } from "zapier/components/AppSettings";

import { Button } from "@calcom/ui/v2";

export default function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="flex items-center justify-center rounded-md border border-gray-200 p-4">
      <div className="flex items-center justify-center">
        <div className="bordre-gray-100 flex h-12 w-12 items-center justify-center rounded-md border p-1">
          <img className="h-8" src={`/api/app-store/zapier/${template.icon}`} />
        </div>
      </div>
      <div className="mx-4">
        <p className="truncate text-sm font-medium text-neutral-900">{template.app}</p>
        <p className="mt-[2px] text-xs text-gray-500 ">{template.text}</p>
      </div>
      <div className="ml-auto">
        <Button color="secondary" className="w-[90px]" target="_blank" href={template.link}>
          Use Zap
        </Button>
      </div>
    </div>
  );
}
