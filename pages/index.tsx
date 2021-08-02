export default function Home() {
  return (
    <div className="loader">
      <span className="loader-inner"></span>
    </div>
  );
}

export async function getStaticProps() {
  return {
    redirect: {
      destination: "/event-types",
      permanent: false,
    },
  };
}
