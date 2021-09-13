import { TrashIcon, DotsHorizontalIcon, PencilAltIcon, GlobeAltIcon } from "@heroicons/react/outline";
import Dropdown from "../ui/Dropdown";
// import { useState } from "react";
import { Dialog, DialogTrigger } from "@components/Dialog";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import Button from "@components/ui/Button";
import showToast from "@lib/notification";
import { Webhook } from "@lib/webhook";

export default function WebhookListItem(props: { onChange: () => void; key: number; webhook: Webhook }) {
  //   const [webhook, setWebhook] = useState<Webhook | null>(props.webhook);

  return (
    <li className="divide-y">
      <div className="flex justify-between my-4">
        <div className="flex">
          <div className="inline-block ml-3 space-y-1">
            <span className="flex text-sm text-neutral-700">
              <GlobeAltIcon className="w-6 h-6 mr-2 text-neutral-900" />
              {props.webhook.subscriberUrl}
            </span>
            <span className="block ml-8 space-x-2 text-xs">
              {props.webhook.eventTriggers.map((webhookEventTrigger, ind) => (
                <span key={ind} className="px-1 text-blue-700 rounded-md bg-blue-50">
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
          <Dropdown className="relative flex text-left">
            <Button
              color="minimal"
              className="w-full pl-5 ml-2"
              StartIcon={DotsHorizontalIcon}
              type="button"></Button>
            <ul
              role="menu"
              className="absolute right-0 z-10 origin-top-right bg-white rounded-sm shadow-lg top-10 w-44 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <li className="text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                <Button
                  type="button"
                  color="minimal"
                  className="w-full"
                  // onClick={() => props.onActionSelect("edit")}
                  StartIcon={PencilAltIcon}>
                  {" "}
                  Edit Webhook
                </Button>
              </li>
              <li className="text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900" role="menuitem">
                <Dialog>
                  <DialogTrigger
                    as={Button}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    color="warn"
                    StartIcon={TrashIcon}
                    className="w-full">
                    Delete Webhook
                  </DialogTrigger>
                  <ConfirmationDialogContent
                    variety="danger"
                    title="Disband Team"
                    confirmBtnText="Yes, disband team"
                    cancelBtnText="Cancel"
                    onConfirm={() => {
                      console.log("confirm");
                    }}>
                    Are you sure you want to disband this team? Anyone who you&apos;ve shared this team link
                    with will no longer be able to book using it.
                  </ConfirmationDialogContent>
                </Dialog>
              </li>
            </ul>
          </Dropdown>
        </div>
      </div>
    </li>
  );
}
