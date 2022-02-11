import { PlusIcon } from "@heroicons/react/solid";
import React from "react";

import { Button, ButtonBaseProps } from "@components/ui/Button";

import { sandboxPage } from ".";

const page = sandboxPage(function ButtonPage() {
  const list: ButtonBaseProps[] = [
    // primary
    { color: "primary" },
    { color: "primary", disabled: true },
    { color: "primary", disabled: true, loading: true },

    // secondary
    { color: "secondary" },
    { color: "secondary", disabled: true },
    { color: "secondary", disabled: true, loading: true },

    // minimal
    { color: "minimal" },
    { color: "minimal", disabled: true },
    { color: "minimal", disabled: true, loading: true },

    // sizes
    { color: "primary", size: "sm" },
    { color: "primary", size: "base" },
    { color: "primary", size: "lg" },

    // // href
    // { href: "/staging" },
    // { href: "/staging", disabled: true },

    { StartIcon: PlusIcon },
    { EndIcon: PlusIcon },
  ];
  return (
    <>
      <div className="bg-gray-200 p-4">
        <h1>Button component</h1>
        <div className="flex flex-col">
          {list.map((props, index) => (
            <div key={index} className="m-2 bg-white p-2">
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
              <Button {...(props as any)}>Button text</Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

export default page.default;
export const getStaticProps = page.getStaticProps;
