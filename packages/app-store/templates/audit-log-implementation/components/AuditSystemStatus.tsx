import { useQuery } from "@tanstack/react-query";

import { Label, showToast } from "@calcom/ui";

import appConfig from "../config.json";

export const AuditSystemStatus = ({ credentialId }: { credentialId: number }) => {
  const { data: checkStatus, isLoading } = useQuery({
    queryKey: ["ping", credentialId.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/integrations/${appConfig.slug}/ping`, {
        method: "post",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          credentialId,
        }),
      });

      if (response.status === 200) {
        showToast("Ping successful. Audit Logging integration is healthy.", "success");
      } else {
        showToast("Ping failed. Please ensure your credentials are valid.", "error");
      }

      return {
        status: response.status,
        message: response.statusText,
        lastCheck: new Date().toLocaleString(),
      };
    },
  });

  if (isLoading || !checkStatus || typeof checkStatus === "undefined") {
    <div className="mb-1 grid h-[60px] grid-cols-3 overflow-hidden rounded-md border" />;
  }

  const credentialIsValid = checkStatus?.status === 200;

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
        <p className="text-[8px]">{checkStatus?.lastCheck}</p>
      </div>
    </div>
  );
};
