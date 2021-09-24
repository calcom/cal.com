import { Menu } from "@headlessui/react";
import { ChatAltIcon } from "@heroicons/react/solid";
import { useIntercom } from "react-use-intercom";

import classNames from "@lib/classNames";

const HelpMenuItem = () => {
  const { boot, show } = useIntercom();
  return (
    <Menu.Item>
      {({ active }) => (
        <button
          onClick={() => {
            boot();
            show();
          }}
          className={classNames(
            active ? "bg-gray-100 text-gray-900" : "text-neutral-700",
            "w-full flex px-4 py-2 text-sm font-medium"
          )}>
          <ChatAltIcon
            className={classNames(
              "text-neutral-400 group-hover:text-neutral-500",
              "mr-2 flex-shrink-0 h-5 w-5"
            )}
            aria-hidden="true"
          />
          Help
        </button>
      )}
    </Menu.Item>
  );
};

export default HelpMenuItem;
