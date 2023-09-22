import { X } from "@phosphor-icons/react";
import * as RadixToast from "@radix-ui/react-toast";
import { motion } from "framer-motion";
import * as React from "react";

const Toast = ({ trigger, title, description, action, swipeDirection, duration }) => {
  const [open, setOpen] = React.useState(false);
  const eventDateRef = React.useRef(new Date());
  const timerRef = React.useRef(0);

  React.useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return (
    <div>
      <RadixToast.Provider swipeDirection={swipeDirection ?? "right"} duration={duration ?? 5000}>
        <span
          onClick={() => {
            setOpen(false);
            window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => {
              eventDateRef.current = oneWeekAway();
              setOpen(true);
            }, 100);
          }}>
          {trigger ?? ""}
        </span>

        <RadixToast.Root
          className="fixed left-[50%] top-0 z-[10] mx-auto flex w-full max-w-[300px] translate-x-[-50%] items-center justify-center"
          open={open}
          onOpenChange={setOpen}>
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 w-full max-w-[300px] rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-[0_0_68px_rgba(0,0,0,0.2)]">
            <div className="flex items-start">
              <div className="w-full">
                {title ? <RadixToast.Title className="text-sm font-semibold">{title}</RadixToast.Title> : ""}
                {description ? (
                  <RadixToast.Description className="text-sm">{description}</RadixToast.Description>
                ) : (
                  ""
                )}
                {action ? (
                  <RadixToast.Action className="ToastAction" asChild>
                    {action}
                  </RadixToast.Action>
                ) : (
                  ""
                )}
              </div>
              <div className="ml-auto">
                <RadixToast.Close>
                  <X size={14} />
                </RadixToast.Close>
              </div>
            </div>
          </motion.div>
        </RadixToast.Root>
        <RadixToast.Viewport />
      </RadixToast.Provider>
    </div>
  );
};

function oneWeekAway() {
  const now = new Date();
  const inOneWeek = now.setDate(now.getDate() + 7);
  return new Date(inOneWeek);
}

export default Toast;
