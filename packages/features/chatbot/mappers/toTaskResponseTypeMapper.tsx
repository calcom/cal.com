import type { ConversationResponseType, RouterResponseType, TaskResponseType } from "../types/responseTypes";

const map = (
  routerResponse: RouterResponseType,
  conversationResponse: ConversationResponseType
): TaskResponseType => {
  // Step 1: parse the response and route results accordingly
  const url_param_enum = routerResponse.url_param_enum;
  const external_link_enum = routerResponse.external_link_enum;

  // Step 2: encapsulate the response
  const taskResponse = {
    url_param: url_param_enum,
    external_link: external_link_enum,
    message: "",
  };
  // Case 1: url parser succeeded, append the url param message
  if (url_param_enum !== "None") {
    taskResponse.message += `${routerResponse.url_param_msg}\n`;
  }
  // Case 2: external link parser succeeded, append the external link message
  if (external_link_enum !== "None") {
    taskResponse.message += `${routerResponse.external_link_msg}\n`;
  }
  // Case 3: neither parser succeeded, append the conversation response
  if (url_param_enum === "None" && external_link_enum === "None") {
    taskResponse.message = conversationResponse.text;
  }
  return taskResponse;
};

export default map;
