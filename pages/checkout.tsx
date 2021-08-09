import Head from "next/head";

export default function Checkout() {
  return (
    <div className="relative bg-white h-screen">
      <Head>
        <title>Get started with Genda</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-blue-700" />
      </div>
      <div className="relative max-w-7xl mx-auto lg:px-8 lg:grid lg:grid-cols-2">
        <div className="bg-white py-16 px-4 sm:py-24 sm:px-6 lg:px-0 lg:pr-8">
          <div className="max-w-lg mx-auto lg:mx-0">
            <h2 className="mt-2 text-2xl font-kollektif text-gray-900 sm:text-4xl">
              Ready to get started?<span className="block text-blue-600">Let&apos;s set you up.</span>
            </h2>
            <dl className="mt-12 space-y-10">
              <div className="relative">
                <dt>
                  <div
                    className="
                absolute
                h-12
                w-12
                flex
                items-center
                justify-center
                bg-blue-500
                rounded-md
              ">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-6 w-6 text-white"
                      aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                    Sign up and enter your card details
                  </p>
                </dt>
                <dd className="ml-16 text-base text-gray-500">
                  Get signed up to Calendso and set up your payment.
                </dd>
              </div>
              <div className="relative">
                <dt>
                  <div
                    className="
                absolute
                h-12
                w-12
                flex
                items-center
                justify-center
                bg-blue-500
                rounded-md
              ">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-6 w-6 text-white"
                      aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Choose your username</p>
                </dt>
                <dd className="ml-16 text-base text-gray-500">
                  Your booking link will be calendso.com/yourusername.
                </dd>
              </div>
              <div className="relative">
                <dt>
                  <div
                    className="
                absolute
                h-12
                w-12
                flex
                items-center
                justify-center
                bg-blue-500
                rounded-md
              ">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-6 w-6 text-white"
                      aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">
                    Set up your event types and integrations
                  </p>
                </dt>
                <dd className="ml-16 text-base text-gray-500">
                  Add your calendar and set up one or more event types.
                </dd>
              </div>
              <div className="relative">
                <dt>
                  <div
                    className="
                absolute
                h-12
                w-12
                flex
                items-center
                justify-center
                bg-blue-500
                rounded-md
              ">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-6 w-6 text-white"
                      aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Start taking bookings</p>
                </dt>
                <dd className="ml-16 text-base text-gray-500">Share your booking link with the world!</dd>
              </div>
            </dl>
          </div>
        </div>
        <div
          className="
      bg-blue-700
      py-16
      px-4
      sm:py-24 sm:px-6
      lg:bg-none lg:px-0 lg:pl-8 lg:flex lg:items-center lg:justify-end
    ">
          <div className="max-w-lg mx-auto w-full space-y-8 lg:mx-0">
            <div>
              <h2 className="sr-only">Price</h2>
              <p className="relative">
                <span>
                  <span className="flex flex-col text-center">
                    <span className="text-5xl font-extrabold text-white tracking-tight">$12</span>
                    <span className="mt-2 text-base font-medium text-blue-200">Per month</span>
                  </span>
                </span>
              </p>
            </div>
            <ul className="rounded overflow-hidden grid gap-px sm:grid-cols-2">
              <li
                className="
            bg-blue-800 bg-opacity-50
            py-4
            px-4
            flex
            items-center
            space-x-3
            text-base text-white
          ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6 text-blue-300"
                  aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Unlimited bookings</span>
              </li>
              <li
                className="
            bg-blue-800 bg-opacity-50
            py-4
            px-4
            flex
            items-center
            space-x-3
            text-base text-white
          ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6 text-blue-300"
                  aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Add any integration</span>
              </li>
              <li
                className="
            bg-blue-800 bg-opacity-50
            py-4
            px-4
            flex
            items-center
            space-x-3
            text-base text-white
          ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6 text-blue-300"
                  aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Open API</span>
              </li>
              <li
                className="
            bg-blue-800 bg-opacity-50
            py-4
            px-4
            flex
            items-center
            space-x-3
            text-base text-white
          ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6 text-blue-300"
                  aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>All updates for free</span>
              </li>
              <li
                className="
            bg-blue-800 bg-opacity-50
            py-4
            px-4
            flex
            items-center
            space-x-3
            text-base text-white
          ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6 text-blue-300"
                  aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>World-class support</span>
              </li>
              <li
                className="
            bg-blue-800 bg-opacity-50
            py-4
            px-4
            flex
            items-center
            space-x-3
            text-base text-white
          ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6 text-blue-300"
                  aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel any time</span>
              </li>
            </ul>
            <form>
              <button
                className="
            bg-white
            border border-transparent
            rounded-md
            w-full
            px-8
            py-4
            flex
            items-center
            justify-center
            text-lg
            leading-6
            font-medium
            text-blue-600
            hover:bg-blue-50
            md:px-10
          "
                type="submit"
                disabled>
                Loading...
              </button>
            </form>
            <a
              href="mailto:contacto@adhocti.com"
              className="
          block
          text-center text-base
          font-medium
          text-blue-200
          hover:text-white
        ">
              Talk to our sales team
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
