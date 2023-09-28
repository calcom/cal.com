import { ArrowSquareOut } from "@phosphor-icons/react";

import { Button, TextHighlight } from "../../ui";

const ProductsBuilt = ({ data }) => {
  const count = data?.projects?.length;
  if (!count) {
    return ``;
  }

  return (
    <div>
      <h3 className="mb-1 text-sm font-medium opacity-50">Projects</h3>
      <p className="text-lg text-gray-600">
        {data?.name} has founded <TextHighlight>{count} projects</TextHighlight>
      </p>
      <div className="mt-4 space-y-5 text-base">
        {data?.projects?.map((item) => (
          <div key={item?.title} className="flex items-center gap-3">
            {item?.logo ? (
              <div className="h-8 w-8">
                <img src={item?.logo} alt={item?.title} className="rounded-full" />
              </div>
            ) : (
              ""
            )}
            <div>
              <Button as="a" href={item?.url} target="_blank" className="flex items-center">
                {item?.title}
                <ArrowSquareOut className="ml-1" />
              </Button>
              <div className="opacity-60">{item?.tagline}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductsBuilt;
