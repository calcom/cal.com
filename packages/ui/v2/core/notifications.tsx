import { Check, Info } from "react-feather";
import toast from "react-hot-toast";

export default function showToast(message: string, variant: "success" | "warning" | "error") {
  switch (variant) {
    case "success":
      toast.custom(
        () => (
          <div className="data-testid-toast-success bg-brand-500 mb-2 flex h-9 items-center space-x-2 rounded-md p-3 text-sm font-semibold text-white shadow-md">
            <Check className="h-4 w-4" />
            <p>{message}</p>
          </div>
        ),
        { duration: 6000 }
      );
      break;
    case "error":
      toast.custom(
        () => (
          <div className="mb-2 flex h-9 items-center space-x-2 rounded-md bg-red-100 p-3 text-sm font-semibold text-red-900 shadow-md">
            <Info className="h-4 w-4" />
            <p>{message}</p>
          </div>
        ),
        { duration: 6000 }
      );
      break;
    case "warning":
      toast.custom(
        () => (
          <div className="bg-brand-500 mb-2 flex h-9 items-center space-x-2 rounded-md p-3 text-sm font-semibold text-white shadow-md">
            <Info className="h-4 w-4" />
            <p>{message}</p>
          </div>
        ),
        { duration: 6000 }
      );
      break;
    default:
      toast.custom(
        () => (
          <div className="bg-brand-500 mb-2 flex h-9 items-center space-x-2 rounded-md p-3 text-sm font-semibold text-white shadow-md">
            <Check className="h-4 w-4" />
            <p>{message}</p>
          </div>
        ),
        { duration: 6000 }
      );
      break;
  }
}
