import * as Dialog from "@radix-ui/react-dialog";
import { CheckIcon } from "@heroicons/react/outline";

export default function Modal(props) {
  return (
    <Dialog.Root open={props.open} onOpenChange={props.handleClose}>
      <Dialog.Overlay className="fixed z-10 inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
      <Dialog.Content className="fixed bottom-20 sm:top-1/2 left-1/2 transform -translate-x-1/2 w-11/12 max-w-max bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transition-all sm:max-w-sm sm:w-full sm:bottom-auto sm:-translate-y-1/2">
        <div>
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
          </div>
          <div className="mt-3 text-center sm:mt-5">
            <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
              {props.heading}
            </Dialog.Title>
            <div className="mt-2">
              <p className="text-sm text-gray-500">{props.description}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-6">
          <Dialog.Close className="btn-wide btn-primary" onClick={() => props.handleClose()}>
            Dismiss
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
