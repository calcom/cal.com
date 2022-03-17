import classNames from "classnames";
import React from "react";

import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/Dialog";

interface Props extends React.PropsWithChildren<any> {
  wide?: boolean;
  scroll?: boolean;
  noPadding?: boolean;
}

export default function ModalContainer(props: Props) {
  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true">
        <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 z-0 bg-gray-500 bg-opacity-75 transition-opacity"
            aria-hidden="true"></div>
          <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
            &#8203;
          </span>
          <div
            className={classNames(
              "min-w-96 inline-block transform rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all sm:my-8 sm:p-6 sm:align-middle",
              {
                "sm:w-full sm:max-w-lg ": !props.wide,
                "sm:w-4xl sm:max-w-4xl": props.wide,
                "overflow-scroll": props.scroll,
                "!p-0": props.noPadding,
              }
            )}>
            {props.children}
          </div>
        </div>
      </div>
      <Dialog defaultOpen={true}>
        <DialogContent
          onInteractOutside={(e) => {
            e.preventDefault();
          }}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="mt-5 flex justify-center">
            <DialogHeader title={t("cancellation_successful")} />
          </div>
          {!loading && !session?.user && (
            <div className="-mt-6 flex justify-center">
              <p className="text-center text-sm text-gray-500">{t("free_to_pick_another_event_type")}</p>
            </div>
          )}
          <div className="flex justify-center">
            <DialogFooter>
              {!loading && !session?.user && <Button href={eventPage as string}>Pick another</Button>}
              {!loading && session?.user && (
                <Button data-testid="back-to-bookings" href="/bookings" EndIcon={ArrowRightIcon}>
                  {t("back_to_bookings")}
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
