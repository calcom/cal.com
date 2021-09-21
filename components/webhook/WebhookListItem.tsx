import { TrashIcon, DotsHorizontalIcon, PencilAltIcon, GlobeAltIcon } from "@heroicons/react/outline";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/Dropdown";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Button from "@components/ui/Button";
import showToast from "@lib/notification";
import { Webhook } from "@lib/webhook";

export default function WebhookListItem(props: { onChange: () => void; key: number; webhook: Webhook }) {
  return (
    <li className="divide-y">
      <div className="flex justify-between my-4">
        <div className="flex">
          <div className="inline-block ml-3 space-y-1">
            <span className="flex text-sm text-neutral-700">
              <GlobeAltIcon className="w-6 h-6 mr-2 text-neutral-900" />
              {props.webhook.subscriberUrl}
            </span>
            <span className="flex flex-col ml-8 space-y-2 text-xs">
              {props.webhook.eventTriggers.map((webhookEventTrigger, ind) => (
                <span key={ind} className="px-1 text-xs text-blue-700 rounded-md w-max bg-blue-50">
                  {webhookEventTrigger}
                </span>
              ))}
            </span>
          </div>
        </div>
        <div className="flex">
          {!props.webhook.active && (
            <span className="self-center h-6 px-3 py-1 text-xs text-gray-700 capitalize rounded-md bg-gray-50">
              Disabled
            </span>
          )}
          {!!props.webhook.active && (
            <span className="self-center h-6 px-3 py-1 text-xs text-green-700 capitalize rounded-md bg-green-50">
              Enabled
            </span>
          )}
          <Dropdown>
            <DropdownMenuTrigger>
              <DotsHorizontalIcon className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Button
                  type="button"
                  color="minimal"
                  className="w-full"
                  // onClick={() => props.onActionSelect("edit")}
                  StartIcon={PencilAltIcon}>
                  {" "}
                  Edit Webhook
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      color="warn"
                      StartIcon={TrashIcon}
                      className="w-full">
                      Delete Webhook
                    </Button>
                  </DialogTrigger>
                  <ConfirmationDialogContent
                    variety="danger"
                    title="Delete Webhook"
                    confirmBtnText="Yes, delete webhook"
                    cancelBtnText="Cancel"
                    onConfirm={() => {
                      console.log("confirm");
                    }}>
                    Are you sure you want to delete this webhook? You will no longer receive Cal.com meeting
                    data at a specified URL, in real-time, when an event is scheduled or canceled .
                  </ConfirmationDialogContent>
                </Dialog>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </Dropdown>
        </div>
      </div>
    </li>
  );
}
