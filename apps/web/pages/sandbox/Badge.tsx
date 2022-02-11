import { Badge, BadgeProps } from "@components/ui/Badge";

import { sandboxPage } from ".";

const page = sandboxPage(function BadgePage() {
  const list: BadgeProps[] = [
    //
    { variant: "success" },
    { variant: "gray" },
    { variant: "success" },
  ];
  return (
    <>
      <div className="bg-gray-200 p-4">
        <h1>Badge component</h1>
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
              <Badge {...(props as any)}>Badge text</Badge>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

export default page.default;
export const getStaticProps = page.getStaticProps;
