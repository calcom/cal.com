import Head from "next/head";

import Button from "@calcom/ui/Button";

export default function Error500() {
  return (
    <div className="flex h-screen">
      <Head>
        <title>Something unexpected occurred | Cal.com</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="m-auto text-center">
        <h1 className="font-cal text-[250px] text-gray-900">
          5
          {
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/error.svg" className="-mt-10 inline w-60" alt="0" />
          }
          0
        </h1>
        <h2 className="mb-2 -mt-16 text-3xl text-gray-600">It&apos;s not you, it&apos;s us.</h2>
        <p className="mb-4 max-w-2xl text-gray-500">
          Something went wrong on our end. Get in touch with our support team, and we’ll get it fixed right
          away for you.
        </p>
        <Button href="https://cal.com/support">Contact support</Button>
        <Button color="secondary" href="javascript:history.back()" className="ml-2">
          Go back
        </Button>
      </div>
    </div>
  );
}
