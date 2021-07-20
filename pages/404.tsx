export default function Page() {
  return (
    <div className="min-h-screen pt-16 pb-12 flex flex-col dark:from-gray-900 dark:to-gray-900  bg-gradient-to-b from-blue-600 via-blue-600 to-blue-300">
      <main className="flex-grow flex flex-col justify-center max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex-shrink-0 flex justify-center">
          <a href="/" className="inline-flex">
            <span className="sr-only">Workflow</span>
            <img className="h-12 w-auto" src="/calendso-white.svg" alt="" />
          </a>
        </div>
        <div className="py-16">
          <div className="text-center">
            <p className="text-sm font-semibold text-white uppercase tracking-wide">Whoops</p>
            <h1 className="mt-2 text-4xl font-extrabold text-white tracking-tight sm:text-5xl">
              Page not found.
            </h1>
            <p className="mt-2 text-base text-white">Sorry, we couldn’t find the page you’re looking for.</p>
            <div className="mt-6">
              <a href="/" className="text-base font-medium text-white hover:text-indigo-500">
                Go back home<span aria-hidden="true"> &rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
