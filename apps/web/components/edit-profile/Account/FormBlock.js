import React from "react";

const FormBlock = ({ title, description, meta, children }) => {
  return (
    <div className="grid w-full grid-cols-1 gap-x-8 gap-y-4 border-b border-gray-900/10 pb-12">
      <div>
        <div className="border-b border-gray-200/60 pb-4">
          <h2 className="text-xl font-semibold leading-7 text-gray-900">{title}</h2>
          <p className="text-sm leading-6 text-gray-600">{description}</p>
          {meta}
        </div>
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
};

export default FormBlock;
