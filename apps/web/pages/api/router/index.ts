import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { getRoutedUrl } from "@calcom/lib/server/getRoutedUrl";

export default defaultHandler({
  POST: Promise.resolve({
    default: defaultResponder(async (req, res) => {
      const payload = JSON.parse(req.body);
      // await new Promise((resolve) => setTimeout(resolve, 10000));
      res.setHeader("Access-Control-Allow-Origin", "*");
      const routedUrlData = await getRoutedUrl({ req, query: { ...payload } });
      if (routedUrlData?.notFound) {
        return res.status(404).json({ error: "Form not found" });
      }

      if (routedUrlData?.redirect?.destination) {
        return res
          .status(200)
          .json({ status: "success", data: { redirect: routedUrlData.redirect.destination } });
      }

      if (routedUrlData?.props) {
        return res
          .status(200)
          .json({ status: "success", data: { message: routedUrlData.props.message ?? "" } });
      }

      return res
        .status(500)
        .json({ status: "error", data: { message: "No Route nor custom message found." } });
    }),
  }),
});
