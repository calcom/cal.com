import { Button, TextHighlight } from "../../ui";

const Investments = ({ data, userData }) => {
  const count = data?.length + 10;
  if (!count) {
    return ``;
  }

  return (
    <div className="">
      <h3 className="mb-1 text-sm font-medium opacity-50">Investments</h3>
      <h2 className="mb-1 text-lg text-gray-600">
        {userData?.name || "Placeholder Name"} has{" "}
        <TextHighlight>invested in {count} companies</TextHighlight>. His last investment was in 2021. His{" "}
        <TextHighlight>biggest investment was $100M in Stripe</TextHighlight>.
      </h2>
      <p className="text-gray-600" />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {data?.slice(0, 5)?.map((item) => (
          <div
            className="flex items-center gap-[6px] rounded-lg border bg-white px-2 py-1 text-sm shadow-[0_0_1px_rgba(0,0,0,0.07)]"
            key={item?.organization}>
            <img src={item?.logo} alt={item?.organization} className="h-5 w-5 rounded-full" />
            <p>{item?.organization}</p>
          </div>
        ))}
        {count > 5 ? (
          <Button className="ml-2 text-sm hover:cursor-pointer hover:underline">View all →</Button>
        ) : (
          ""
        )}
      </div>
    </div>
  );
};

export default Investments;
