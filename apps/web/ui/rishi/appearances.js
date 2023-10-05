import { ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@ui";

const Appearances = ({ data }) => {
  const count = data?.length;
  if (!count) {
    return ``;
  }

  return (
    <div id="mentions">
      <h3 className="mb-1 text-sm font-medium opacity-50">Top Mentions & Appearances</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {data?.slice(0, 5)?.map((item) =>
          item?.url ? (
            <div
              className="flex flex-col items-start gap-[6px] rounded-lg border bg-white text-sm shadow-[0_0_3px_rgba(0,0,0,0.04)]"
              key={item?.title}>
              <div className="flex h-[100px] w-full items-center justify-center rounded-t-[7px] bg-gray-100 py-2">
                {item?.image ? (
                  <img
                    src={item?.image}
                    alt={item?.title}
                    className="max-h-[70px] max-w-[200px] rounded-lg md:max-w-[70%]"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-mono">
                    {new URL(item?.url)?.hostname?.replace("www.", "")?.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start gap-[6px] px-4 py-3">
                <div className="">{item?.title}</div>
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    className="mb-1 flex w-auto items-center break-all rounded-md bg-gray-100 px-2 py-px font-mono text-xs hover:bg-black hover:text-white"
                    title={item?.url}
                    as="a"
                    href={item?.url}
                    target="_blank">
                    {new URL(item?.url)?.hostname?.slice(0, 20)?.replace("www.", "")}
                    {new URL(item?.url)?.hostname?.length > 20 ? "..." : ""}
                    <ArrowSquareOut className="ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            ""
          )
        )}
      </div>
      {/* {count > 5 ? (
        <Button className="text-sm hover:underline hover:cursor-pointer mt-5 py-1 rounded-lg">
          View all →
        </Button>
      ) : (
        ""
      )} */}
    </div>
  );
};

export default Appearances;
