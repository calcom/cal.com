import { Button, ButtonProps } from "@components/ui/Button";
import { PlusIcon } from "@heroicons/react/solid";
import Head from "next/head";
import React from "react";

export default function ButtonPage() {
  const list: ButtonProps[] = [
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

    // href
    { href: "/staging" },
    { href: "/staging", disabled: true },

    { StartIcon: PlusIcon },
    { EndIcon: PlusIcon },
  ];
  return (
    <>
      <Head>
        <meta name="googlebot" content="noindex" />
      </Head>
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
              <Button {...props}>Button text</Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
