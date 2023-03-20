import { Button } from "@calcom/ui";

import { Template } from "./AppSettings";

export default function TemplateCard({ template }: { template: Template }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white p-5">
      <div className="min-h-16 flex items-start justify-start">
        <div>
          <div className="mr-4 flex h-12 w-12 items-center justify-center rounded-md p-1">
            <img className="h-8" alt={template.app} src={`/api/app-store/zapier/${template.icon}`} />
          </div>
        </div>
        <div className="mr-4">
          <div>
            <p className="truncate text-sm font-medium leading-4 text-gray-900">{template.app}</p>
            <p className="mt-[2px] text-sm text-gray-500">{template.text}</p>
          </div>
        </div>
      </div>
      <div className="relative float-right ml-auto mt-4 hidden h-full sm:block">
        <Button
          color="secondary"
          className="absolute bottom-0 right-0 w-[90px]"
          target="_blank"
          href={template.link}>
          Use Zap
        </Button>
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
