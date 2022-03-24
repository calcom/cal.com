import toast from "react-hot-toast";

export default function showToast(message: string, variant: "success" | "warning" | "error") {
  switch (variant) {
    case "success":
      toast.success(message, {
        duration: 6000,
        style: {
          borderRadius: "2px",
          background: "#333",
          color: "#fff",
          boxShadow: "none",
        },
      });
      break;
    case "error":
      toast.error(message, {
        duration: 6000,
        style: {
          borderRadius: "2px",
          background: "#FEE2E2",
          color: "#B91C1C",
          boxShadow: "none",
        },
      });
      break;
    case "warning":
      toast(message, {
        duration: 6000,
        style: {
          borderRadius: "2px",
          background: "#FFEDD5",
          color: "#C2410C",
          boxShadow: "none",
        },
      });
      break;
    default:
      toast.success(message, {
        duration: 6000,
        style: {
          borderRadius: "2px",
          background: "#333",
          color: "#fff",
          boxShadow: "none",
        },
      });
  }
}
