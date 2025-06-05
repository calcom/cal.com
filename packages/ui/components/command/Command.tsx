import type { DialogProps } from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import * as React from "react";

import classNames from "@calcom/ui/classNames";

import { Dialog, DialogContent } from "../dialog";

const Command = function Command({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive> & {
  ref: React.RefObject<React.ElementRef<typeof CommandPrimitive>>;
}) {
  return (
    <CommandPrimitive
      ref={forwardedRef}
      className={classNames(
        "bg-popover text-default flex h-full w-full flex-col overflow-hidden rounded-md",
        className
      )}
      {...props}
    />
  );
};
Command.displayName = CommandPrimitive.displayName;

type CommandDialogProps = DialogProps;

const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command className="[&_[cmdk-group-heading]]:text-muted hover:bg-subtle transition [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = function CommandInput({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
  ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Input>>;
}) {
  return (
    <div className="flex items-center border-b px-3 py-2" cmdk-input-wrapper="">
      <CommandPrimitive.Input
        ref={forwardedRef}
        className={classNames(
          "placeholder:text-muted hover:border-emphasis dark:focus:border-emphasis border-default bg-default placeholder:text-muted text-emphasis disabled:hover:border-default disabled:bg-subtle focus:ring-brand-default focus:border-subtle block flex h-[28px] w-full rounded-md rounded-md border bg-transparent px-3 py-1.5 text-sm text-sm leading-4 outline-none focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
};

CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = function CommandList({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.List> & {
  ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.List>>;
}) {
  return (
    <CommandPrimitive.List
      ref={forwardedRef}
      className={classNames("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  );
};

CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = function CommandEmpty({
  ref: forwardedRef,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty> & {
  ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Empty>>;
}) {
  return <CommandPrimitive.Empty ref={forwardedRef} className="py-6 text-center text-sm" {...props} />;
};

CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = function CommandGroup({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group> & {
  ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Group>>;
}) {
  return (
    <CommandPrimitive.Group
      ref={forwardedRef}
      className={classNames(
        "text-default [&_[cmdk-group-heading]]:text-muted overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
        className
      )}
      {...props}
    />
  );
};

CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = function CommandSeparator({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator> & {
  ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Separator>>;
}) {
  return (
    <CommandPrimitive.Separator
      ref={forwardedRef}
      className={classNames("bg-subtle -mx-1 mb-2 h-px", className)}
      {...props}
    />
  );
};
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = function CommandItem({
  ref: forwardedRef,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> & {
  ref: React.RefObject<React.ElementRef<typeof CommandPrimitive.Item>>;
}) {
  return (
    <CommandPrimitive.Item
      ref={forwardedRef}
      className={classNames(
        "aria-selected:bg-muted aria-selected:text-emphasis relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    />
  );
};

CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return <span className={classNames("text-muted ml-auto text-xs tracking-widest", className)} {...props} />;
};

CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
