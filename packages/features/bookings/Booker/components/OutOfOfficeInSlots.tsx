import type { IOutOfOfficeData } from "@calcom/core/getUserAvailability";
import { classNames } from "@calcom/lib";
import { Button } from "@calcom/ui";

interface IOutOfOfficeInSlotsProps {
  fromUser?: IOutOfOfficeData["anyDate"]["user"];
  returnDate: string;
  toUser?: IOutOfOfficeData["anyDate"]["toUser"];
  emojiStatus?: string;
  borderDashed?: boolean;
}

export const OutOfOfficeInSlots = (props: IOutOfOfficeInSlotsProps) => {
  const { fromUser, returnDate, toUser, emojiStatus = "🏝️", borderDashed = true } = props;

  if (!fromUser || !returnDate) return null;
  return (
    <div className="h-full pb-2">
      <div
        className={classNames(
          "z-10 flex h-full flex-col items-center justify-start rounded-md border bg-white px-4 py-4 dark:bg-transparent",
          borderDashed && "border-dashed"
        )}>
        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gray-400 text-center text-2xl">
          {emojiStatus}
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-md mt-2 font-bold">{fromUser.displayName} is OOO</h1>

          {fromUser?.displayName && toUser?.displayName && (
            <p className="text-center text-sm">
              <span className="font-bold">{toUser?.displayName}</span> can take their meetings while they are
              away.
            </p>
          )}
        </div>
        {toUser?.id && (
          <Button className="mt-8 max-w-[90%]" variant="button" color="secondary">
            <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
              Book with {toUser.displayName}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
};
