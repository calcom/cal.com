import type { Dispatch, SetStateAction } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui";

interface IInstantCallDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
}

export const InstantCallDialog = (props: IInstantCallDialog) => {
  const { t } = useLocale();

  const multipleCallers = true; // just for testing purposes

  const { isOpenDialog, setIsOpenDialog } = props;

  return (
    <>
      <Dialog open={true} onOpenChange={setIsOpenDialog}>
        <DialogContent enableOverflow>
          {multipleCallers ? (
            <>
              <DialogHeader title={t("Incoming Calls")} />
              <ul role="list" className="mb-6 divide-y">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex w-full items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-semibold">{comment.name}</p>
                      <p className="line-clamp-2 w-full text-sm">{comment.content}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" className="border-[#DE4B2B] !bg-[#DE4B2B] text-white">
                        {t("Ignore")}
                      </Button>
                      <Button StartIcon="phone" className="border-[#52B65A] !bg-[#52B65A] text-white">
                        {t("Accept")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <DialogHeader title={t("Incoming Call")} />
              <div>
                <p>Peer Richelsen is calling for a &quot;NAME OF EVENT TYPE&quot; meeting.</p>
                <p>You have n minutes and n seconds to accept.</p>
              </div>
              <DialogFooter>
                <div className="flex w-full justify-center gap-2">
                  <Button type="button" className="border-[#DE4B2B] !bg-[#DE4B2B] text-white">
                    {t("Ignore")}
                  </Button>
                  <Button StartIcon="phone" className="border-[#52B65A] !bg-[#52B65A] text-white">
                    {t("Accept")}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
        {/* TODO: Add programmatic way of triggering the audio without controls */}
        <audio controls src="/ringing.mp3">
          Your browser does not support the
          <code>audio</code> element.
        </audio>
      </Dialog>
    </>
  );
};

const comments = [
  {
    id: 1,
    name: "Leslie Alexander",
    content: "Sales Exploration",
    date: "1d ago",
    dateTime: "2023-03-04T15:54Z",
  },
  {
    id: 2,
    name: "Michael Foster",
    content: "Sales Exploration",
    date: "2d ago",
    dateTime: "2023-03-03T14:02Z",
  },
  {
    id: 3,
    name: "Dries Vincent",
    content: "Sales Exploration",
    date: "2d ago",
    dateTime: "2023-03-03T13:23Z",
  },
  {
    id: 4,
    name: "Lindsay Walton",
    content: "Sales Exploration",
    date: "3d ago",
    dateTime: "2023-03-02T21:13Z",
  },
];
