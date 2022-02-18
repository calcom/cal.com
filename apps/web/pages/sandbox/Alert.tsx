import React from "react";

import { Alert, AlertProps } from "@components/ui/Alert";

import { sandboxPage } from ".";

const page = sandboxPage(function AlertPage() {
  const list: AlertProps[] = [
    { title: "Something went wrong", severity: "error" },
    { title: "Something went kinda wrong", severity: "warning" },
    { title: "Something went great", severity: "success" },
    { title: "Something went wrong", severity: "error", message: "Some extra context" },
    {
      title: "Something went wrong",
      severity: "error",
      message: (
        <p>
          Some extra context
          <br />
          hey
        </p>
      ),
    },
  ];
  return (
    <>
      <div className="bg-gray-200 p-4">
        <h1>Alert component</h1>
        <div className="flex flex-col">
          {list.map((props, index) => (
            <div key={index} className="m-2 bg-white p-2">
              <h3>
                <code>
                  {JSON.stringify(
                    props,
                    (key, value) => {
                      if (key.includes("message")) {
                        return "..";
                      }
                      return value;
                    },
                    2
                  )}
                </code>
              </h3>
              <Alert {...props}>Alert text</Alert>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

export default page.default;
export const getStaticProps = page.getStaticProps;
