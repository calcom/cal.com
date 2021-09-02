import { ChevronRightIcon } from "@heroicons/react/solid";
import { BookOpenIcon, CheckIcon, CodeIcon, DocumentTextIcon } from "@heroicons/react/outline";
import { useRouter } from "next/router";
import React from "react";
import Link from "next/link";
import { HeadSeo } from "@components/seo/head-seo";

const links = [
  {
    title: "Documentation",
    description: "Learn how to integrate our tools with your app",
    icon: DocumentTextIcon,
    href: "https://docs.calendso.com",
  },
  {
    title: "API Reference",
    description: "A complete API reference for our libraries",
    icon: CodeIcon,
    href: "https://api.docs.calendso.com",
  },
  {
    title: "Blog",
    description: "Read our latest news and articles",
    icon: BookOpenIcon,
    href: "https://calendso.com/blog",
  },
];

export default function Custom404() {
  const router = useRouter();
  const username = router.asPath.replace("%20", "-");

  return (
    <>
      <HeadSeo
        title="404: This page could not be found."
        description="404: This page could not be found."
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div className="bg-white min-h-screen px-4">
        <main className="max-w-xl mx-auto pb-6 pt-16 sm:pt-24">
          <div className="text-center">
            <p className="text-sm font-semibold text-black uppercase tracking-wide">404 error</p>
            <h1 className="mt-2 text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
              This page does not exist.
            </h1>
            <a href="https://checkout.calendso.com" className="inline-block mt-2 text-lg ">
              The username <strong className="text-blue-500">calendso.com{username}</strong> is still
              available. <span className="text-blue-500">Register now</span>.
            </a>
          </div>
          <div className="mt-12">
            <h2 className="text-sm font-semibold text-gray-500 tracking-wide uppercase">Popular pages</h2>

            <ul role="list" className="mt-4">
              <li className="border-2 border-green-500 px-4 py-2">
                <a href="https://checkout.calendso.com" className="relative py-6 flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <span className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-50">
                      <CheckIcon className="h-6 w-6 text-green-500" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-medium text-gray-900">
                      <span className="rounded-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500">
                        <span className="focus:outline-none">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Register <strong className="text-green-500">{username}</strong>
                        </span>
                      </span>
                    </h3>
                    <p className="text-base text-gray-500">Claim your username and schedule events</p>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                </a>
              </li>
            </ul>

            <ul role="list" className="mt-4 border-gray-200 divide-y divide-gray-200">
              {links.map((link, linkIdx) => (
                <li key={linkIdx} className="px-4 py-2">
                  <Link href={link.href}>
                    <a className="relative py-6 flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <span className="flex items-center justify-center h-12 w-12 rounded-lg bg-gray-50">
                          <link.icon className="h-6 w-6 text-gray-700" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-medium text-gray-900">
                          <span className="rounded-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500">
                            <span className="absolute inset-0" aria-hidden="true" />
                            {link.title}
                          </span>
                        </h3>
                        <p className="text-base text-gray-500">{link.description}</p>
                      </div>
                      <div className="flex-shrink-0 self-center">
                        <ChevronRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                    </a>
                  </Link>
                </li>
              ))}
              <li className="px-4 py-2">
                <a href="https://calendso.com/slack" className="relative py-6 flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <span className="flex items-center justify-center h-12 w-12 rounded-lg bg-gray-50">
                      <svg viewBox="0 0 2447.6 2452.5" className="h-6 w-6" xmlns="http://www.w3.org/2000/svg">
                        <g clipRule="evenodd" fillRule="evenodd">
                          <path
                            d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z"
                            fill="rgba(55, 65, 81)"></path>
                          <path
                            d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z"
                            fill="rgba(55, 65, 81)"></path>
                          <path
                            d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z"
                            fill="rgba(55, 65, 81)"></path>
                          <path
                            d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0"
                            fill="rgba(55, 65, 81)"></path>
                        </g>
                      </svg>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-medium text-gray-900">
                      <span className="rounded-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500">
                        <span className="absolute inset-0" aria-hidden="true" />
                        Slack
                      </span>
                    </h3>
                    <p className="text-base text-gray-500">Join our community</p>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                </a>
              </li>
            </ul>
            <div className="mt-8">
              <Link href="/">
                <a className="text-base font-medium text-black hover:text-gray-500">
                  Or go back home<span aria-hidden="true"> &rarr;</span>
                </a>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
