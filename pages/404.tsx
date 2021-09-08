import { HeadSeo } from "@components/seo/head-seo";
import { CheckIcon } from "@heroicons/react/outline";
import { ChevronRightIcon } from "@heroicons/react/solid";
import { CHECKOUT_URL } from "@lib/config/globals";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";

const links = [];

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
      <div className="min-h-screen px-4 bg-white">
        <main className="max-w-xl pt-16 pb-6 mx-auto sm:pt-24">
          <div className="text-center">
            <p className="text-sm font-semibold tracking-wide text-black uppercase">Error 404</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Ésta página no existe.
            </h1>
            <a href={CHECKOUT_URL} className="inline-block mt-2 text-lg ">
              El usuario <strong className="text-blue-500">a.genda.me{username}</strong> aun está disponible.{" "}
              <span className="text-blue-500">Registrate ahora</span>.
            </a>
          </div>
          <div className="mt-12">
            <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Ir a otra página</h2>

            <ul role="list" className="mt-4">
              <li className="px-4 py-2 border-2 border-green-500">
                <a href={CHECKOUT_URL} className="relative flex items-start py-6 space-x-4">
                  <div className="flex-shrink-0">
                    <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-green-50">
                      <CheckIcon className="w-6 h-6 text-green-500" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900">
                      <span className="rounded-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500">
                        <span className="focus:outline-none">
                          <span className="absolute inset-0" aria-hidden="true" />
                          Registra <strong className="text-green-500">{username}</strong>
                        </span>
                      </span>
                    </h3>
                    <p className="text-base text-gray-500">Reclama tu nombre de usuario y agenda eventos</p>
                  </div>
                  <div className="self-center flex-shrink-0">
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                  </div>
                </a>
              </li>
            </ul>

            <ul role="list" className="mt-4 border-gray-200 divide-y divide-gray-200">
              {links.map((link, linkIdx) => (
                <li key={linkIdx} className="px-4 py-2">
                  <Link href={link.href}>
                    <a className="relative flex items-start py-6 space-x-4">
                      <div className="flex-shrink-0">
                        <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-50">
                          <link.icon className="w-6 h-6 text-gray-700" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-900">
                          <span className="rounded-sm focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gray-500">
                            <span className="absolute inset-0" aria-hidden="true" />
                            {link.title}
                          </span>
                        </h3>
                        <p className="text-base text-gray-500">{link.description}</p>
                      </div>
                      <div className="self-center flex-shrink-0">
                        <ChevronRightIcon className="w-5 h-5 text-gray-400" aria-hidden="true" />
                      </div>
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/">
                <a className="text-base font-medium text-black hover:text-gray-500">
                  O volver al inicio<span aria-hidden="true"> &rarr;</span>
                </a>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
