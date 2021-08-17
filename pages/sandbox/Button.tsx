import { Button, ButtonProps } from "@components/ui/Button";
import { MailIcon } from "@heroicons/react/solid";
import React from "react";

export default function ButtonPage() {
  const list: ButtonProps[] = [
    // colors
    { color: "primary" },
    { color: "secondary" },

    // disabled state
    { color: "primary", disabled: true },
    { color: "secondary", disabled: true },
    { color: "primary", disabled: true, loading: true },
    { color: "secondary", disabled: true, loading: true },

    // sizes
    { color: "primary", size: "lg" },
    { color: "primary", size: "sm" },

    // href
    { href: "/staging" },
    { href: "/staging", disabled: true },

    { StartIcon: MailIcon },
    { EndIcon: MailIcon },
  ];
  return (
    <div className="p-4 bg-gray-200">
      <h1>Button component</h1>
      <div className="flex flex-col">
        {list.map((props, index) => (
          <div key={index} className="p-2 m-2 bg-white">
            <h3>
              <code>
                {JSON.stringify(
                  props,
                  (key, value) => {
                    if (key.includes("Icon")) {
                      return "..";
                    }
                    return value;
                  },
                  2
                )}
              </code>
            </h3>
            <Button {...props}>Text</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
