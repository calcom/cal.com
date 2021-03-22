import Head from 'next/head'

export default function Home() {
  return (
    <div>
      <Head>
        <title>Calendso</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="text-center">
        <h1 className="text-2xl font-semibold">
          Welcome to Calendso!
        </h1>
      </main>
    </div>
  )
}
