import type { AIPhoneSettingSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type CreatePhoneCallProps = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: z.infer<typeof AIPhoneSettingSchema>;
};

const createPhoneCallHandler = async ({ input }: CreatePhoneCallProps) => {
  // const options = {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${process.env.RETELL_AI_KEY}`, "Content-Type": "application/json" },
  //   body: '{"override_agent_id":"oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD","phone_number":{"from":14157774444,"to":12137774445},"retell_llm_dynamic_variables":{"customer_name":"John Doe"}}',
  // };

  // const res = await fetch("https://api.retellai.com/create-phone-call", options)
  //   .then((response) => response.json())
  //   .then((response) => console.log(response))
  //   .catch((err) => console.error(err));

  console.log("res", res);
};

export default createPhoneCallHandler;
