import type { IOutOfOfficeData } from "@calcom/core/getUserAvailability";
import { Button } from "@calcom/ui";

interface IOutOfOfficeInSlotsProps {
  fromUser: IOutOfOfficeData["anyDate"]["user"];
  returnDate: string;
  toUser?: IOutOfOfficeData["anyDate"]["toUser"];
}

export const OutOfOfficeInSlots = (props: IOutOfOfficeInSlotsProps) => {
  const { fromUser, returnDate, toUser } = props;
  if (!fromUser || !returnDate) return null;
  return (
    <div className="mx-1 my-6 flex flex-col items-center justify-center rounded-md border border-dashed px-6 py-6">
      <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-gray-400 text-center text-2xl">
        🏝️
      </div>
      <div className="space-y-2 text-center">
        <h1 className="text-md mt-2 font-bold">{fromUser.displayName} is OOO</h1>
        {!fromUser.id && (
          <p className="text-center text-sm">
            {fromUser.displayName} will be back on {returnDate}.
          </p>
        )}
        {fromUser?.displayName && toUser?.displayName && (
          <p className="text-center text-sm">
            {fromUser.displayName} will be back on {returnDate}, they have selected{" "}
            <span className="font-bold">{toUser?.displayName}</span> to take their meetings while they are
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
  );
};
