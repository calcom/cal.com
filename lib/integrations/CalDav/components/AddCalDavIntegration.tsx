import React from "react";

type Props = {
  onSubmit: () => void;
};

export const ADD_CALDAV_INTEGRATION_FORM_TITLE = "addCalDav";
export type AddCalDavIntegrationRequest = {
  url: string;
  username: string;
  password: string;
};

const AddCalDavIntegration = React.forwardRef<HTMLFormElement, Props>((props, ref) => {
  const onSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();

    props.onSubmit();
  };

  return (
    <form id={ADD_CALDAV_INTEGRATION_FORM_TITLE} ref={ref} onSubmit={onSubmit}>
      <div className="mb-2">
        <label htmlFor="url" className="block text-sm font-medium text-gray-700">
          Calendar URL
        </label>
        <div className="mt-1 rounded-md shadow-sm flex">
          <input
            required
            type="text"
            name="url"
            id="url"
            placeholder="https://example.com/calendar"
            className="focus:ring-black focus:border-black flex-grow block w-full min-w-0 rounded-none rounded-r-sm sm:text-sm border-gray-300 lowercase"
          />
        </div>
      </div>
      <div className="mb-2">
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          required
          type="text"
          name="username"
          id="username"
          placeholder="rickroll"
          className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
        />
      </div>
      <div className="mb-2">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          required
          type="password"
          name="password"
          id="password"
          placeholder="•••••••••••••"
          className="mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm"
        />
      </div>
    </form>
  );
});

AddCalDavIntegration.displayName = "AddCalDavIntegrationForm";
export default AddCalDavIntegration;
