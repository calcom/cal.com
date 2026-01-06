import { Icon } from "@calid/features/ui/components/icon/Icon";
import { Input } from "@calid/features/ui/components/input/input";
import { ScrollArea } from "@calid/features/ui/components/scroll-area";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/button";
import { Badge } from "@calcom/ui/components/badge";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/dialog";

interface WorkflowStatusDialogProps {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  workflowInsights: any[];
  isMultiSeat: boolean;
}

// Helper function to get status badge variant
const getStatusVariant = (status: string): "default" | "success" | "orange" | "red" | "gray" => {
  switch (status) {
    case "SENT":
      return "success";
    case "SCHEDULED":
      return "orange";
    case "QUEUED":
      return "gray";
    case "FAILED":
      return "red";
    case "CANCELLED":
      return "red";
    default:
      return "default";
  }
};

// Helper function to get channel icon
const getChannelIcon = (channel: string): string => {
  switch (channel) {
    case "EMAIL":
      return "mail";
    case "SMS":
      return "message-square";
    case "WHATSAPP":
      return "message-circle";
    default:
      return "bell";
  }
};

/**
 * WorkflowStatusDialog Component
 *
 * Displays workflow automation status for bookings.
 * For single-seat bookings: Shows workflow status directly
 * For multi-seat bookings: Shows attendee selection first, then workflow status
 */
export const WorkflowStatusDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  workflowInsights,
  isMultiSeat,
}: WorkflowStatusDialogProps) => {
  const { t } = useLocale();
  const [selectedAttendee, setSelectedAttendee] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if we need search (more than 10 seats)
  const shouldShowSearch = isMultiSeat && workflowInsights.length > 10;

  // Filter attendees based on search query
  const filteredAttendees = useMemo(() => {
    if (!searchQuery.trim() || !isMultiSeat) return workflowInsights;

    return workflowInsights.filter((insight) =>
      insight.attendeeEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [workflowInsights, searchQuery, isMultiSeat]);

  // Reset state when dialog closes
  const handleDialogChange = (open: boolean) => {
    setIsOpenDialog(open);
    if (!open) {
      setSelectedAttendee(null);
      setSearchQuery("");
    }
  };

  // For single-seat bookings, get the workflow data directly
  const singleSeatWorkflows = !isMultiSeat ? workflowInsights : null;

  // For multi-seat bookings, get the selected attendee's workflows
  const selectedAttendeeWorkflows = useMemo(() => {
    if (!isMultiSeat || selectedAttendee === null) return null;
    const attendee = workflowInsights.find((insight) => insight.attendeeId === selectedAttendee);
    return attendee?.workflows || null;
  }, [isMultiSeat, selectedAttendee, workflowInsights]);

  // Render workflow details (used for both single-seat and selected attendee)
  const renderWorkflowDetails = (workflows: any[], attendeeEmail?: string) => (
    <div className="space-y-3">
      {attendeeEmail && (
        <div className="mb-4 flex items-center gap-2">
          <Button
            color="minimal"
            StartIcon="arrow-left"
            onClick={() => setSelectedAttendee(null)}
            className="p-0">
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="bg-default flex h-6 w-6 items-center justify-center rounded-full">
              <span className="text-default text-xs font-medium">
                {attendeeEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-default text-sm font-medium">{attendeeEmail}</span>
          </div>
        </div>
      )}

      {workflows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">{t("no_reminders")}</div>
      ) : (
        workflows.map((workflow: any) => (
          <div key={workflow.workflowId} className="border-subtle rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="zap" className="h-4 w-4 text-purple-500" />
                <span className="text-default text-sm font-medium">{workflow.workflowName}</span>
              </div>
              <Badge variant="gray" size="sm">
                {workflow.trigger}
              </Badge>
            </div>

            <div className="space-y-1.5">
              {workflow.steps.map((step: any, stepIndex: number) => (
                <div key={stepIndex} className="flex items-center justify-between rounded-md bg-gray-50 p-2">
                  <div className="flex items-center gap-2">
                    <Icon name={getChannelIcon(step.channel)} className="text-muted h-3.5 w-3.5" />
                    <span className="text-default text-xs">{step.stepName}</span>
                  </div>
                  <Badge variant={getStatusVariant(step.status)} size="sm">
                    {step.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Render attendee selection list for multi-seat bookings
  const renderAttendeeSelection = () => (
    <div>
      {/* Search field - only show if more than 10 seats */}
      {shouldShowSearch && (
        <div className="mb-4">
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Showing {filteredAttendees.length} of {workflowInsights.length} attendees
          </p>
        </div>
      )}

      {/* Attendee list */}
      {filteredAttendees.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500">
          No attendees found matching "{searchQuery}"
        </div>
      ) : (
        <ScrollArea className={shouldShowSearch ? "h-[400px] pr-3" : "max-h-[400px] pr-3"}>
          <div className="space-y-2">
            {filteredAttendees.map((attendeeInsight) => {
              const hasWorkflows = attendeeInsight.workflows && attendeeInsight.workflows.length > 0;

              return (
                <button
                  key={attendeeInsight.attendeeId}
                  onClick={() => setSelectedAttendee(attendeeInsight.attendeeId)}
                  className="border-subtle hover:bg-muted flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="bg-default flex h-6 w-6 items-center justify-center rounded-full">
                      <span className="text-default text-xs font-medium">
                        {attendeeInsight.attendeeEmail.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-default text-sm font-medium">{attendeeInsight.attendeeEmail}</span>
                    {!hasWorkflows && (
                      <Badge variant="gray" size="sm">
                        {t("no_reminders")}
                      </Badge>
                    )}
                  </div>
                  <Icon name="chevron-right" className="text-muted h-4 w-4" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );

  return (
    <Dialog open={isOpenDialog} onOpenChange={handleDialogChange}>
      <DialogContent enableOverflow>
        <DialogHeader
          title={t("workflow_reminders")}
          subtitle={
            isMultiSeat && selectedAttendee === null
              ? "Select an attendee to view their workflow status"
              : "View workflow automation status"
          }
        />

        <div>
          {/* Single-seat: Show workflows directly */}
          {!isMultiSeat && singleSeatWorkflows && renderWorkflowDetails(singleSeatWorkflows)}

          {/* Multi-seat: Show attendee selection or selected attendee's workflows */}
          {isMultiSeat && (
            <>
              {selectedAttendee === null ? (
                renderAttendeeSelection()
              ) : (
                <>
                  {selectedAttendeeWorkflows &&
                    renderWorkflowDetails(
                      selectedAttendeeWorkflows,
                      workflowInsights.find((i) => i.attendeeId === selectedAttendee)?.attendeeEmail
                    )}
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <DialogClose className="border">Close</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
