import { Label } from "@calcom/ui";

import { useAppCredential } from "../context/CredentialContext";

export const AuditSystemStatus = () => {
  const { status, statusLoading: isLoading } = useAppCredential();

  if (isLoading || !status || typeof status === "undefined") {
    return (
      <div className="mb-1 grid h-[60px] grid-cols-3 overflow-hidden rounded-md border">
        <div className="flex flex-row items-center justify-center border-r-[1px]">
          <svg className="h-5 w-5 animate-spin bg-lime-600" viewBox="0 0 24 24" />
        </div>
        <div className="col-span-2 flex w-[100%] flex-col items-center justify-center">
          <Label className="mb-0 text-[11px]">Checking System</Label>
        </div>
      </div>
    );
  }

  const credentialIsValid = status?.status === 200;

  return (
    <div className="mb-1 grid h-[60px] grid-cols-3 overflow-hidden rounded-md border">
      <div className="flex flex-row items-center justify-center border-r-[1px]">
        <span className="relative flex h-5 w-5">
          <span
            data-status={credentialIsValid}
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-600 opacity-75 data-[status=true]:bg-lime-700"
          />
          <span
            data-status={credentialIsValid}
            className="relative inline-flex h-5 w-5 rounded-full bg-red-800 data-[status=true]:bg-lime-600"
          />
        </span>
      </div>
      <div className="col-span-2 flex w-[100%] flex-col items-center justify-center">
        <Label className="mb-0 text-[11px]">
          {credentialIsValid ? "System Operational" : "Credential Invalid"}
        </Label>
        <p className="text-[8px]">{status?.lastCheck}</p>
      </div>
    </div>
  );
};
