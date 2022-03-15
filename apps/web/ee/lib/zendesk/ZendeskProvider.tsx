import Zendesk from "react-zendesk";

const ZENDESK_KEY = process.env.NEXT_PUBLIC_ZENDESK_KEY;

const setting = {
  color: {
    theme: "#292929",
  },
  contactForm: {
    fields: [{ id: "description", prefill: { "*": "My pre-filled description" } }],
  },
};

export default function ZendeskProvider() {
  if (!ZENDESK_KEY) return null;
  else
    return <Zendesk defer zendeskKey={ZENDESK_KEY} {...setting} onLoaded={() => console.log("is loaded")} />;
}
