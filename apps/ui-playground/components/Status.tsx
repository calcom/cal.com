import { Badge, Button } from "@calcom/ui";

interface StatusProps {
  designStatus: string | null;
  devStatus: string | null;
  airtableId?: string;
  figmaLink?: string;
}

type StatusVariant = "default" | "success" | "warning" | "error" | "orange";

const getDesignStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case "Ready for dev":
      return "success";
    case "In progress":
      return "orange";
    case "Needs changes":
      return "error";
    case "Not started":
      return "default";
    default:
      return "default";
  }
};

const getDevStatusVariant = (status: string): StatusVariant => {
  switch (status) {
    case "Approved":
      return "success";
    case "Ready for review":
      return "warning";
    case "Changes requested":
    case "Needs Changes":
      return "error";
    case "Not started":
      return "default";
    default:
      return "default";
  }
};

export function Status({ designStatus, devStatus, airtableId, figmalink }: StatusProps) {
  if (!designStatus && !devStatus) return null;

  const airtableUrl = airtableId
    ? `https://airtable.com/appJJ9Br9n7rgSDpg/tblhjfeOxzkrPnx0d/viwKl3TFdeaJeIgad/${airtableId}?blocks=hide`
    : null;

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex flex-col flex-wrap gap-2">
        {airtableUrl && (
          <Button
            href={airtableUrl}
            target="_blank"
            rel="noopener noreferrer"
            EndIcon="external-link"
            className="w-fit"
            color="secondary">
            View in Airtable
          </Button>
        )}
        {figmalink && (
          <Button
            href={figmalink}
            target="_blank"
            rel="noopener noreferrer"
            EndIcon="external-link"
            className="w-fit"
            color="secondary">
            View in Figma
          </Button>
        )}
        {designStatus && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Design:</span>
            <Badge variant={getDesignStatusVariant(designStatus)}>{designStatus}</Badge>
          </div>
        )}
        {devStatus && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Dev:</span>
            <Badge variant={getDevStatusVariant(devStatus)}>{devStatus}</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
