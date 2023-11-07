import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ExternalLink } from "lucide-react";

type MobileDropdownContentProps = {
  isManagedEventType: boolean;
  calLink: string;
  id: number;
  onPreview: (link: string) => void;
  onCopy: (link: string) => void;
};

export function MobileDropdownContent({
  isManagedEventType,
  calLink,
  id,
  onPreview,
  onCopy,
}: MobileDropdownContentProps) {
  return (
    <>
      {isManagedEventType && (
        <>
          <DropdownMenuItem className="outline-none">
            <Button
              onClick={() => {
                onPreview(calLink);
              }}
              data-testid="preview-link-button"
              type="button"
              className="w-full rounded-none">
              <ExternalLink />
              Preview
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem className="outline-none">
            <Button
              data-testid={`event-type-duplicate-${id}`}
              type="button"
              className="w-full rounded-none text-left"
              onClick={() => {
                onCopy(calLink);
              }}>
              Copy link to event
            </Button>
          </DropdownMenuItem>
        </>
      )}
    </>
  );
}
