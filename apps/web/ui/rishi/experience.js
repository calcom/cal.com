import { ArrowSquareOut } from "@phosphor-icons/react";

import { Button } from "../../ui";

const Experience = ({ data }) => {
  const count = data?.length;
  if (!count) {
    return ``;
  }

  return (
    <div id="experience">
      <h3 className="mb-1 text-sm font-medium opacity-50">Experience</h3>

      <div className="mt-4 grid grid-cols-1 gap-10">
        {data?.map((item, index) => (
          <div key={item?.title + index}>
            <div className="relative flex items-center bg-white py-1 text-sm">
              <div className="relative flex flex-col bg-white pr-2 md:flex-row md:items-center">
                <div className="text-base font-medium">{item?.company}</div>
                {item?.url ? (
                  <div className="mt-1 flex items-center gap-2 md:ml-1 md:mt-0">
                    <Button
                      className="flex w-auto items-center break-all rounded-md bg-gray-100 px-2 py-px font-mono text-xs hover:bg-black hover:text-white"
                      title={item?.url}
                      href={item?.url}
                      as="a"
                      target="_blank">
                      {new URL(item?.url)?.hostname?.replaceAll("www.", "")?.slice(0, 17)}
                      {new URL(item?.url)?.hostname?.length > 17 ? "..." : ""}
                      <ArrowSquareOut className="ml-1" />
                    </Button>
                  </div>
                ) : (
                  ""
                )}
              </div>
            </div>
            <div>
              {item?.roles?.length ? (
                <div>
                  {item?.roles?.map((role) => (
                    <div key={role?.title}>
                      <div className="relative flex items-center">
                        <span className="absolute top-[50%] h-[2px] w-full translate-y-[-50%] bg-gray-100" />
                        <div className="relative mb-1 mt-2 bg-white pr-2 text-sm font-semibold">
                          {role?.position}
                        </div>
                        <div className="relative ml-auto flex items-center bg-white pl-2 text-sm">
                          <div className="opacity-50">
                            {role?.start_date} - {role?.end_date}
                          </div>
                        </div>
                      </div>
                      <div className="opacity-70">{role?.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                ""
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Experience;
