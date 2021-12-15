import { ShieldCheckIcon } from "@heroicons/react/solid";
import React from "react";

const TwoFactorModalHeader = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="mb-4 sm:flex sm:items-start">
      <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full bg-brand text-brandcontrast bg-opacity-5 sm:mx-0 sm:h-10 sm:w-10">
        <ShieldCheckIcon className="w-6 h-6 text-black" />
      </div>
      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
        <h3 className="text-lg font-medium leading-6 text-gray-900 font-cal" id="modal-title">
          {title}
        </h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
};

export default TwoFactorModalHeader;
