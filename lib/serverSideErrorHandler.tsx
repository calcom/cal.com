function serverSideErrorHandler(error: string) {
  switch (error) {
    case "noSession":
      return {
        redirect: { permanent: false, destination: "/auth/login" },
        props: {} as never,
      };
    case "invalidFileName":
      throw new Error(`File is not named [type]/[user]`);
    case "notFound":
    default:
      return { notFound: true, props: {} as never };
  }
}

export default serverSideErrorHandler;
