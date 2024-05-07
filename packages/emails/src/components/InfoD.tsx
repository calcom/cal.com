import React from "react";

import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";

const Spacer = () => <p style={{ height: 6 }} />;

export const InfoD = (props) => {
  if (!props.description || props.description === "") return null;

  // Function to remove <br> and <big> tags from the description
  const filterDescription = (content) => {
    if (typeof content !== "string") return content;
    return content.replace(/<(br|big)[^>]*>/g, "");
  };

  // Apply the filter to the description content
  const filteredDescription = filterDescription(props.description.toString());

  // Check if the filtered description is a string
  const isString = typeof filteredDescription === "string";

  return (
    <>
      {props.withSpacer && <Spacer />}
      <div>
        <p style={{ color: "#101010" }}>{props.label}</p>
        <p
          style={{
            color: "#101010",
            fontWeight: 400,
            lineHeight: "24px",
            whiteSpace: "pre-wrap",
            textDecoration: props.lineThrough ? "line-through" : undefined,
          }}>
          {props.formatted ? (
            isString ? ( // Check if the filtered description is a string
              <div
                className="dark:text-darkgray-600 mt-2 text-sm text-gray-500 [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
                dangerouslySetInnerHTML={{
                  __html: markdownToSafeHTML(filteredDescription),
                }}
              />
            ) : (
              // If not a string, recursively render each part of the structure
              <div className="dark:text-darkgray-600 mt-2 text-sm text-gray-500 [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600">
                {filteredDescription.props.children.map((child, index) => {
                  if (typeof child === "object") {
                    if (Array.isArray(child)) {
                      return (
                        <React.Fragment key={index}>
                          {child.map((item, idx) => (
                            <div key={idx}>{item}</div>
                          ))}
                        </React.Fragment>
                      );
                    } else {
                      return <div key={index}>{child}</div>;
                    }
                  } else {
                    return <div key={index}>{child}</div>;
                  }
                })}
              </div>
            )
          ) : (
            filteredDescription // Render filtered description
          )}
        </p>
        {props.extraInfo}
      </div>
    </>
  );
};
