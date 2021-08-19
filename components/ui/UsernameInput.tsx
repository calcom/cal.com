import React from "react";

const UsernameInput = React.forwardRef((props, ref) => (
  // todo, check if username is already taken here?
  <div>
    <label htmlFor="username" className="block text-gray-700 text-sm font-medium">
      Username
    </label>
    <div className="flex mt-1 rounded-md shadow-sm">
      <span className="inline-flex items-center px-3 text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-sm sm:text-sm">
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
        className="block flex-grow w-full min-w-0 focus:border-black border-gray-300 rounded-none rounded-r-sm lowercase focus:ring-black sm:text-sm"
      />
    </div>
  </div>
));

UsernameInput.displayName = "UsernameInput";

export { UsernameInput };
