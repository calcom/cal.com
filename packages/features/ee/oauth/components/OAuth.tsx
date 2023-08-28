export default function OAuth() {
  return (
    <main className="bg-gray-50 py-20">
      <div className="mx-auto h-[600px] max-w-xl rounded-md border bg-white p-4 text-base">
        <div className="-mt-14 mb-10 flex items-center justify-center space-x-4">
          <img
            alt="demo"
            className="h-20 w-20 rounded-full shadow-lg"
            src="https://cdn.zapier.com/zapier/images/favicon.ico"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="h-10 w-10 items-center justify-center rounded-full text-gray-400">
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
          </svg>
          <img
            alt="demo"
            className="h-20 w-20 rounded-full shadow-lg"
            src="https://pbs.twimg.com/profile_images/1587109979072389122/Il5ibw7l_400x400.jpg"
          />
        </div>
        <h1 className="font-cal text-center text-xl text-gray-600">
          <strong>Zapier</strong> would like to access your <strong>Cal.com</strong> account
        </h1>
        <h2 className="my-8 text-gray-500">This will allow Zapier to:</h2>

        <ul className="space-y-2 text-sm">
          <li className="border-b pb-2">Associate you with your personal info on Cal.com</li>
          <li className="border-b pb-2">
            See your personal info, including any personal info you&apos;ve made publicly available
          </li>
          <li className="border-b pb-2">See your primary email address</li>
          <li className="border-b pb-2">Connect to your installed Apps</li>
          <li className="border-b pb-2">Read, edit, delete your event-types</li>
          <li className="border-b pb-2">Read, edit, delete your availabilty</li>
          <li className="border-b pb-2">Read, edit, delete your bookings</li>
          <li />
        </ul>
      </div>
    </main>
  );
}
