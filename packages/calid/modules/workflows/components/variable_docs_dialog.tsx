import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import { Icon } from "@calid/features/ui/components/icon";
import type { Dispatch, SetStateAction } from "react";

interface VariableDocsDialogProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

interface VariableDoc {
  variable: string;
  description: string;
}

const VARIABLE_DOCUMENTATION: VariableDoc[] = [
  {
    variable: "{{event_name}}",
    description: "The title or name of the scheduled event",
  },
  {
    variable: "{{event_date}}",
    description: "The date when the event is scheduled",
  },
  {
    variable: "{{event_time}}",
    description: "The start time of the event",
  },
  {
    variable: "{{event_end_time}}",
    description: "The end time of the event",
  },
  {
    variable: "{{timezone}}",
    description: "The timezone in which the event is scheduled",
  },
  {
    variable: "{{location}}",
    description: "The location or meeting link for the event",
  },
  {
    variable: "{{organizer_name}}",
    description: "The full name of the event organizer",
  },
  {
    variable: "{{attendee_name}}",
    description: "The full name of the event attendee",
  },
  {
    variable: "{{attendee_first_name}}",
    description: "The first name of the event attendee",
  },
  {
    variable: "{{attendee_last_name}}",
    description: "The last name of the event attendee",
  },
  {
    variable: "{{attendee_email}}",
    description: "The email address of the event attendee",
  },
  {
    variable: "{{additional_notes}}",
    description: "Any additional notes or comments for the event",
  },
  {
    variable: "{{meeting_url}}",
    description: "The URL to join the meeting or event",
  },
  {
    variable: "{{cancel_url}}",
    description: "The URL to cancel the event",
  },
  {
    variable: "{{reschedule_url}}",
    description: "The URL to reschedule the event",
  },
  {
    variable: "{{rating_url}}",
    description: "The URL for attendees to rate the event",
  },
  {
    variable: "{{no_show_url}}",
    description: "The URL to report a no-show for the event",
  },
  {
    variable: "{{attendee_timezone}}",
    description: "The timezone of the attendee",
  },
  {
    variable: "{{event_start_time_in_attendee_timezone}}",
    description: "The event start time converted to the attendee's timezone",
  },
  {
    variable: "{{event_end_time_in_attendee_timezone}}",
    description: "The event end time converted to the attendee's timezone",
  },
];

export const VariableDocsDialog = ({ isOpen, setIsOpen }: VariableDocsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>WhatsApp Template Variables</DialogTitle>
          <DialogDescription>
            Use these variables in your custom WhatsApp templates to automatically insert dynamic event
            information. Variables must be enclosed in double curly braces exactly as shown below.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex items-start">
              <Icon name="info" className="mt-0.5 h-5 w-5 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>Important:</strong> When creating templates in your Meta Business account, use these
                  exact variable names. Our system will automatically replace them with actual event data when
                  sending messages.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {VARIABLE_DOCUMENTATION.map((doc) => (
              <div key={doc.variable} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <code className="rounded bg-gray-100 px-2 py-1 text-sm font-semibold text-gray-800">
                      {doc.variable}
                    </code>
                    <p className="mt-2 text-sm text-gray-600">{doc.description}</p>
                  </div>
                  <Button
                    color="minimal"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(doc.variable);
                    }}
                    className="flex-shrink-0">
                    <Icon name="copy" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex items-start">
              <Icon name="alert-triangle" className="mt-0.5 h-5 w-5 text-yellow-600" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Variables must match exactly (case-sensitive and including the curly
                  braces). Any typos will prevent the variable from being replaced with actual data.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <DialogClose />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
