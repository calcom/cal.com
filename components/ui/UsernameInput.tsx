import React from "react";

const UsernameInput = React.forwardRef((props, ref) => (
  // todo, check if username is already taken here?
  <div>
    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
      Username
    </label>
    <div className="mt-1 rounded-md shadow-sm flex">
      <span className="bg-gray-50 border border-r-0 border-gray-300 rounded-l-md px-3 inline-flex items-center text-gray-500 sm:text-sm">
        {typeof window !== "undefined" && window.location.hostname}/
      </span>
      <input
        ref={ref}
        type="text"
        name="username"
        id="username"
        autoComplete="username"
        required
        {...props}
        className="focus:ring-blue-500 focus:border-blue-500 flex-grow block w-full min-w-0 rounded-none rounded-r-md sm:text-sm border-gray-300 lowercase"
      />
    </div>
  </div>
));

UsernameInput.displayName = "UsernameInput";

export { UsernameInput };
