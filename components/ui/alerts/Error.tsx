import { XCircleIcon } from "@heroicons/react/solid";

export default function ErrorAlert(props) {
  return (
    <div className="p-4 bg-red-50 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <XCircleIcon className="w-5 h-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-red-800 text-sm font-medium">Something went wrong</h3>
          <div className="text-red-700 text-sm">
            <p>{props.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
