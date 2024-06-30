import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname, useRouter } from "next/navigation";
import type { ForwardRefExoticComponent, ReactElement, ReactNode } from "react";
import React, { useMemo, useState, createContext, useContext } from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { Dialog as PlatformDialogPrimitives, useIsPlatform } from "@calcom/atoms/monorepo";
import classNames from "@calcom/lib/classNames";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";

import type { IconName } from "../..";
import { Icon } from "../..";
import type { ButtonProps } from "../../components/button";
import { Button } from "../../components/button";

export type DialogProps = React.ComponentProps<(typeof DialogPrimitive)["Root"]> & {
  name?: string;
  clearQueryParamsOnClose?: string[];
  useDialogForMobile?: boolean;
};

type DialogContextProps = {
  _useDialogForMobile?: boolean;
};

const DialogContext = createContext<DialogContextProps>({
  _useDialogForMobile: false,
});

type DialogProviderProps = {
  children: ReactNode;
  useDialogForMobile?: boolean;
};

const DialogProvider = ({ children, useDialogForMobile = false }: DialogProviderProps) => {
  const [_useDialogForMobile] = useState(useDialogForMobile);
  return <DialogContext.Provider value={{ _useDialogForMobile }}>{children}</DialogContext.Provider>;
};

const useDialogMediaQuery = () => {
  const { _useDialogForMobile } = useContext(DialogContext);
  const isMobile = useMediaQuery("(max-width: 768px)");
  if (_useDialogForMobile) return false;
  return isMobile;
};

const enum DIALOG_STATE {
  // Dialog is there in the DOM but not visible.
  CLOSED = "CLOSED",
  // State from the time b/w the Dialog is dismissed and the time the "dialog" query param is removed from the URL.
  CLOSING = "CLOSING",
  // Dialog is visible.
  OPEN = "OPEN",
}

export function Dialog(props: DialogProps) {
  const isPlatform = useIsPlatform();
  return !isPlatform ? <WebDialog {...props} /> : <PlatformDialogPrimitives.Dialog {...props} />;
}

function WebDialog(props: DialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useCompatSearchParams();
  const newSearchParams = new URLSearchParams(searchParams ?? undefined);
  const { children, name, useDialogForMobile, ...dialogProps } = props;
  let isMobile = useMediaQuery("(max-width: 768px)");
  isMobile = useDialogForMobile ? false : isMobile;

  // only used if name is set
  const [dialogState, setDialogState] = useState(dialogProps.open ? DIALOG_STATE.OPEN : DIALOG_STATE.CLOSED);
  const shouldOpenDialog = newSearchParams.get("dialog") === name;
  if (name) {
    const clearQueryParamsOnClose = ["dialog", ...(props.clearQueryParamsOnClose || [])];
    dialogProps.onOpenChange = (open) => {
      if (props.onOpenChange) {
        props.onOpenChange(open);
      }

      // toggles "dialog" query param
      if (open) {
        newSearchParams.set("dialog", name);
      } else {
        clearQueryParamsOnClose.forEach((queryParam) => {
          newSearchParams.delete(queryParam);
        });
        router.push(`${pathname}?${newSearchParams.toString()}`);
      }
      setDialogState(open ? DIALOG_STATE.OPEN : DIALOG_STATE.CLOSING);
    };

    if (dialogState === DIALOG_STATE.CLOSED && shouldOpenDialog) {
      setDialogState(DIALOG_STATE.OPEN);
    }

    if (dialogState === DIALOG_STATE.CLOSING && !shouldOpenDialog) {
      setDialogState(DIALOG_STATE.CLOSED);
    }

    // allow overriding
    if (!("open" in dialogProps)) {
      dialogProps.open = dialogState === DIALOG_STATE.OPEN ? true : false;
    }
  }

  return (
    <DialogProvider useDialogForMobile={useDialogForMobile}>
      {isMobile ? (
        <DrawerPrimitive.Root {...dialogProps}>{children}</DrawerPrimitive.Root>
      ) : (
        <DialogPrimitive.Root {...dialogProps}>{children}</DialogPrimitive.Root>
      )}
    </DialogProvider>
  );
}

function DialogPortalWrapper({ children }: { children: ReactElement }) {
  const isMobile = useDialogMediaQuery();
  const isPlatform = useIsPlatform();
  const [Portal, Overlay] = useMemo(
    () =>
      isPlatform
        ? [
            ({ children }: { children: ReactElement | ReactElement[] }) => <>{children}</>,
            PlatformDialogPrimitives.DialogOverlay,
          ]
        : isMobile
        ? [DrawerPrimitive.Portal, DrawerPrimitive.Overlay]
        : [DialogPrimitive.Portal, DialogPrimitive.Overlay],
    [isPlatform, isMobile]
  );
  return (
    <Portal>
      <Overlay className="fadeIn fixed inset-0 z-50 bg-neutral-800 bg-opacity-70 transition-opacity dark:bg-opacity-70 " />
      {children}
    </Portal>
  );
}

function DialogContentWrapper(
  props: {
    children?: ReactNode;
    forwardedRef?: React.ForwardedRef<HTMLDivElement>;
    className?: string;
  } & (DialogContentProps | DrawerContentProps)
) {
  const isMobile = useDialogMediaQuery();
  const { enableOverflow, forwardedRef, children, ...rest } = props;
  const isPlatform = useIsPlatform();
  const [Content] = useMemo(
    () => (isPlatform ? [PlatformDialogPrimitives.DialogContent] : [DialogPrimitive.Content]),
    [isPlatform]
  );
  if (isMobile) {
    return (
      <DrawerPrimitive.Content
        {...(rest as DrawerContentProps)}
        className={classNames(
          "fadeIn bg-default scroll-bar fixed inset-x-0 bottom-0 z-50 flex max-h-[95vh] w-full flex-col overflow-visible rounded-t-md text-left shadow-xl after:!hidden focus-visible:outline-none sm:align-middle",
          `${props.className || ""}`
        )}
        ref={forwardedRef}>
        <div className="bg-muted mx-auto mt-4 h-2 w-[100px] rounded-full" />
        <div
          className={classNames(
            "scroll-bar mx-auto w-full rounded-t-md px-8 pt-8",
            enableOverflow ? "overflow-auto" : "overflow-visible"
          )}>
          {children}
        </div>
      </DrawerPrimitive.Content>
    );
  }
  return (
    <Content
      {...(rest as DialogContentProps)}
      className={classNames(
        "fadeIn bg-default scroll-bar fixed left-1/2 top-1/2 z-50 w-full max-w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-md text-left shadow-xl focus-visible:outline-none sm:align-middle",
        props.size == "xl"
          ? "px-8 pt-8 sm:max-w-[90rem]"
          : props.size == "lg"
          ? "px-8 pt-8 sm:max-w-[70rem]"
          : props.size == "md"
          ? "px-8 pt-8 sm:max-w-[48rem]"
          : "px-8 pt-8 sm:max-w-[35rem]",
        "max-h-[95vh]",
        enableOverflow ? "overflow-auto" : "overflow-visible",
        `${props.className || ""}`
      )}
      ref={forwardedRef}>
      {children}
    </Content>
  );
}

type DialogContentProps = React.ComponentProps<(typeof DialogPrimitive)["Content"]> & ContentProps;
type DrawerContentProps = React.ComponentProps<(typeof DrawerPrimitive)["Content"]> & ContentProps;

type ContentProps = {
  size?: "xl" | "lg" | "md";
  type?: "creation" | "confirmation";
  title?: string;
  description?: string | JSX.Element | null;
  closeText?: string;
  actionDisabled?: boolean;
  Icon?: IconName;
  enableOverflow?: boolean;
};

// enableOverflow:- use this prop whenever content inside DialogContent could overflow and require scrollbar
export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps | DrawerContentProps>(
  ({ children, title, Icon: icon, enableOverflow, type = "creation", ...props }, forwardedRef) => {
    return (
      <DialogPortalWrapper>
        <DialogContentWrapper {...props} enableOverflow={enableOverflow} ref={forwardedRef}>
          {type === "creation" && (
            <div>
              <DialogHeader title={title} subtitle={props.description} />
              <div data-testid="dialog-creation" className="flex flex-col">
                {children}
              </div>
            </div>
          )}
          {type === "confirmation" && (
            <div className="flex">
              {icon && (
                <div className="bg-emphasis flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
                  <Icon name={icon} className="text-emphasis h-4 w-4" />
                </div>
              )}
              <div className="ml-4 flex-grow">
                <DialogHeader title={title} subtitle={props.description} />
                <div data-testid="dialog-confirmation">{children}</div>
              </div>
            </div>
          )}
          {!type && children}
        </DialogContentWrapper>
      </DialogPortalWrapper>
    );
  }
);

type DialogHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;

export function DialogHeader(props: DialogHeaderProps) {
  if (!props.title) return null;

  return (
    <div className="mb-4">
      <h3
        data-testid="dialog-title"
        className="leading-20 text-semibold font-cal text-emphasis pb-1 text-xl"
        id="modal-title">
        {props.title}
      </h3>
      {props.subtitle && <p className="text-subtle text-sm">{props.subtitle}</p>}
    </div>
  );
}

type DialogFooterProps = {
  children: React.ReactNode;
  showDivider?: boolean;
  noSticky?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function DialogFooter(props: DialogFooterProps) {
  return (
    <div
      className={classNames("bg-default sticky bottom-0", props?.noSticky ? "" : "sticky", props.className)}>
      {props.showDivider && (
        // TODO: the -mx-8 is causing overflow in the dialog buttons
        <hr data-testid="divider" className="border-subtle -mx-8" />
      )}
      <div
        className={classNames(
          "flex justify-end space-x-2 pb-2 pt-2 rtl:space-x-reverse md:pb-4 md:pt-4",
          !props.showDivider && "pb-6 md:pb-8"
        )}>
        {props.children}
      </div>
    </div>
  );
}

DialogContent.displayName = "DialogContent";

export const DialogTrigger: ForwardRefExoticComponent<
  DialogPrimitive.DialogTriggerProps & React.RefAttributes<HTMLButtonElement>
> = React.forwardRef((props, ref) => {
  const isPlatform = useIsPlatform();
  return !isPlatform ? (
    <DialogPrimitive.Trigger {...props} ref={ref} />
  ) : (
    <PlatformDialogPrimitives.DialogTrigger {...props} ref={ref} />
  );
});

DialogTrigger.displayName = "DialogTrigger";

function DialogCloseWrapper(props: {
  children: ReactNode;
  dialogCloseProps?: React.ComponentProps<(typeof DialogPrimitive)["Close"]>;
}) {
  const { children, ...rest } = props;
  const isMobile = useDialogMediaQuery();
  const isPlatform = useIsPlatform();
  const Close = useMemo(
    () => (isPlatform ? PlatformDialogPrimitives.DialogClose : DialogPrimitive.Close),
    [isPlatform]
  );
  if (isMobile)
    return (
      <DrawerPrimitive.Close asChild {...rest}>
        {children}
      </DrawerPrimitive.Close>
    );
  return (
    <Close asChild {...rest}>
      {children}
    </Close>
  );
}

type DialogCloseProps = {
  "data-testid"?: string;
  dialogCloseProps?: React.ComponentProps<(typeof DialogPrimitive)["Close"]>;
  children?: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  disabled?: boolean;
  color?: ButtonProps["color"];
} & React.ComponentProps<typeof Button>;

export function DialogClose(
  props: {
    "data-testid"?: string;
    dialogCloseProps?: React.ComponentProps<(typeof DialogPrimitive)["Close"]>;
    children?: ReactNode;
    onClick?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    disabled?: boolean;
    color?: ButtonProps["color"];
  } & React.ComponentProps<typeof Button>
) {
  const { t } = useLocale();
  const isPlatform = useIsPlatform();
  const Close = useMemo(
    () => (isPlatform ? PlatformDialogPrimitives.DialogClose : DialogPrimitive.Close),
    [isPlatform]
  );

  return (
    <DialogCloseWrapper {...props.dialogCloseProps}>
      {/* This will require the i18n string passed in */}
      <Button
        data-testid={props["data-testid"] || "dialog-rejection"}
        color={props.color || "minimal"}
        {...props}>
        {props.children ? props.children : t("close")}
      </Button>
    </DialogCloseWrapper>
  );
}

DialogClose.displayName = "WebDialogClose";
