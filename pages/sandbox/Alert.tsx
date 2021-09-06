import { Alert, AlertProps } from "@components/ui/Alert";
import Head from "next/head";
import React from "react";

export default function AlertPage() {
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
      <Head>
        <meta name="googlebot" content="noindex" />
      </Head>
      <div className="p-4 bg-gray-200">
        <h1>Alert component</h1>
        <div className="flex flex-col">
          {list.map((props, index) => (
            <div key={index} className="p-2 m-2 bg-white">
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
}
