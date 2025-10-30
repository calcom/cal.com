import { getRoutedUrl } from "@calcom/features/routing-forms/lib/getRoutedUrl";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";

export default defaultHandler({
  OPTIONS: Promise.resolve({
    default: defaultResponder(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, cache-control, pragma");
      res.status(204).end();
    }),
  }),
  POST: Promise.resolve({
    default: defaultResponder(async (req, res) => {
      // getRoutedUrl has more detailed schema validation, we do a basic one here.
      const params = req.body;
      res.setHeader("Access-Control-Allow-Origin", "*");
      const routedUrlData = await getRoutedUrl({ req, query: { ...params } });
      if (routedUrlData?.notFound) {
        return res.status(404).json({ status: "error", data: { message: "Form not found" } });
      }

      if (routedUrlData?.redirect?.destination) {
        return res
          .status(200)
          .json({ status: "success", data: { redirect: routedUrlData.redirect.destination } });
      }

      if (routedUrlData?.props?.errorMessage) {
        return res.status(400).json({ status: "error", data: { message: routedUrlData.props.errorMessage } });
      }

      if (routedUrlData?.props?.message) {
        return res.status(200).json({ status: "success", data: { message: routedUrlData.props.message } });
      }

      return res
        .status(500)
        .json({ status: "error", data: { message: "Neither Route nor custom message found." } });
    }),
  }),
});
