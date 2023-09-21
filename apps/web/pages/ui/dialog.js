import { X } from "@phosphor-icons/react";
import * as RadixDialog from "@radix-ui/react-dialog";

const Dialog = ({ trigger, content, title, description, hideClose, ...props }) => (
  <RadixDialog.Root {...props}>
    <RadixDialog.Trigger asChild>{trigger ?? ""}</RadixDialog.Trigger>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-20 bg-black/50" />
      <RadixDialog.Content className="fixed left-[50%] top-[50%] z-[99999999999] w-full max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white/90 px-6 py-4 shadow-[0_0_40px_rgba(0,0,0,0.3)] backdrop-blur">
        {hideClose ? (
          ""
        ) : (
          <RadixDialog.Close className="absolute right-6 top-4 z-40">
            <div className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200">
              <X size={14} />
            </div>
          </RadixDialog.Close>
        )}
        {title ? (
          <RadixDialog.Title className="mb-4 text-sm font-semibold opacity-50">{title}</RadixDialog.Title>
        ) : (
          ""
        )}
        {description && (
          <RadixDialog.Description className="mb-5 mt-2 text-sm leading-normal text-gray-600">
            {description}
          </RadixDialog.Description>
        )}
        {content ?? ""}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  </RadixDialog.Root>
);

export default Dialog;
