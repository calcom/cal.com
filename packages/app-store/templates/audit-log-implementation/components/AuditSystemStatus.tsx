import { Label } from "@calcom/ui";

export const AuditSystemStatus = () => {
  return (
    <div className="mb-1 grid h-[60px] grid-cols-3 overflow-hidden rounded-md border">
      <div className="flex flex-row items-center justify-center border-r-[1px]">
        <span className="relative flex h-5 w-5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-700 opacity-75" />
          <span className="relative inline-flex h-5 w-5 rounded-full bg-lime-600" />
        </span>
      </div>
      <div className="col-span-2 flex w-[100%] flex-col items-center justify-center">
        <Label className="mb-0 text-[11px]">System Operational</Label>
        <p className="text-[8px]">{new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};
