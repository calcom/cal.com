import React from "react";

type Props = {
  onSubmit: () => void;
};

export const ADD_CALDAV_INTEGRATION_FORM_TITLE = "addCalDav";

const AddCalDavIntegration = React.forwardRef<HTMLFormElement, Props>((props, ref) => {
  const onSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();

    props.onSubmit();
  };

  return (
    <form id={ADD_CALDAV_INTEGRATION_FORM_TITLE} ref={ref} onSubmit={onSubmit}>
      <div className="mb-2">
        <label htmlFor="url" className="block text-gray-700 text-sm font-medium">
          Calendar URL
        </label>
        <div className="flex mt-1 rounded-md shadow-sm">
          <input
            required
            type="text"
            name="url"
            id="url"
            placeholder="https://example.com/calendar"
            className="block flex-grow w-full min-w-0 focus:border-black border-gray-300 rounded-none rounded-r-sm lowercase focus:ring-black sm:text-sm"
          />
        </div>
      </div>
      <div className="mb-2">
        <label htmlFor="username" className="block text-gray-700 text-sm font-medium">
          Username
        </label>
        <input
          required
          type="text"
          name="username"
          id="username"
          placeholder="rickroll"
          className="block mt-1 px-3 py-2 w-full border border-gray-300 focus:border-neutral-500 rounded-sm focus:outline-none shadow-sm focus:ring-neutral-500 sm:text-sm"
        />
      </div>
      <div className="mb-2">
        <label htmlFor="password" className="block text-gray-700 text-sm font-medium">
          Password
        </label>
        <input
          required
          type="password"
          name="password"
          id="password"
          placeholder="•••••••••••••"
          className="block mt-1 px-3 py-2 w-full border border-gray-300 focus:border-neutral-500 rounded-sm focus:outline-none shadow-sm focus:ring-neutral-500 sm:text-sm"
        />
      </div>
    </form>
  );
});

AddCalDavIntegration.displayName = "AddCalDavIntegrationForm";
export default AddCalDavIntegration;
