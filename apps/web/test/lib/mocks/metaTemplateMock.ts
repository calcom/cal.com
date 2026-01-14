export const mockSyncTest: WhatsAppTemplate = {
  id: "2249434075534658",
  name: "sync_test",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      text: "Hello world",
      type: "BODY",
    },
  ],
  sub_category: "CUSTOM",
  parameter_format: "POSITIONAL",
};

export const mockLiquidTest: WhatsAppTemplate = {
  id: "802469525646210",
  name: "liquid_test",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: [
          "https://scontent.whatsapp.net/v/t61.29466-34/491874397_802469528979543_1846329698344644222_n.jpg?...",
        ],
      },
    },
    {
      text: "Hello {{contact}}. How are you?",
      type: "BODY",
      example: {
        body_text_named_params: [
          {
            example: "name",
            param_name: "contact",
          },
        ],
      },
    },
  ],
  parameter_format: "NAMED",
};

export const mockMediaTemplate: WhatsAppTemplate = {
  id: "4104424219874570",
  name: "media_template",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: [
          "https://scontent.whatsapp.net/v/t61.29466-34/491874930_4104424226541236_7891563279031730350_n.jpg?...",
        ],
      },
    },
    {
      text: "Hello {{email}} and {{phone}}.\n\n{{agent_name}} has sent you...",
      type: "BODY",
      example: {
        body_text_named_params: [
          { example: "sukh@onehash.ai", param_name: "email" },
          { example: "90102939", param_name: "phone" },
          { example: "golu", param_name: "agent_name" },
          { example: "OneHash", param_name: "account" },
          { example: "Whatsapp", param_name: "inbox" },
        ],
      },
    },
  ],
  parameter_format: "NAMED",
};

export const mockButtonTemplate: WhatsAppTemplate = {
  id: "794299626430518",
  name: "button_template",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: ["https://scontent.whatsapp.net/v/t61.29466-34/491874990_794299629763851_..."],
      },
    },
    {
      text: "Add a header, body and footer...",
      type: "BODY",
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockPaperfly: WhatsAppTemplate = {
  id: "1417561615991904",
  name: "paperfly",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: ["https://scontent.whatsapp.net/v/t61.29466-34/491876079_1417561619325237_..."],
      },
    },
    {
      text: "আপনার ব্যবসার সাফল্যে – Paperfly সবসময় পাশে …",
      type: "BODY",
    },
  ],
  sub_category: "CUSTOM",
  parameter_format: "POSITIONAL",
};

export const mockOpeth: WhatsAppTemplate = {
  id: "757289837118936",
  name: "opeth",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: ["https://scontent.whatsapp.net/v/t61.29466-34/518480269_757289840452269_..."],
      },
    },
    { text: "Hello", type: "BODY" },
    {
      type: "BUTTONS",
      buttons: [
        {
          text: "Call phone number",
          type: "PHONE_NUMBER",
          phone_number: "+916284851183",
        },
      ],
    },
  ],
  parameter_format: "POSITIONAL",
};

export const mockTesting: WhatsAppTemplate = {
  id: "1305963653941388",
  name: "testing",
  status: "APPROVED",
  category: "UTILITY",
  language: "en",
  components: [
    {
      type: "HEADER",
      format: "IMAGE",
      example: {
        header_handle: ["https://scontent.whatsapp.net/v/t61.29466-34/473402695_1305963657274721_..."],
      },
    },
    {
      text: "Hello {{name}}. Thank you…",
      type: "BODY",
      example: { body_text_named_params: [{ example: "Rishabh", param_name: "name" }] },
    },
  ],
  sub_category: "CUSTOM",
  parameter_format: "NAMED",
};

export const mockCrmTest: WhatsAppTemplate = {
  id: "966677364792579",
  name: "crm_test",
  status: "APPROVED",
  category: "MARKETING",
  language: "en",
  components: [{ text: "Testing v15 CRM...", type: "BODY" }],
  parameter_format: "POSITIONAL",
};

export const mockChatTest: WhatsAppTemplate = {
  id: "904216864814772",
  name: "chat_test",
  status: "APPROVED",
  category: "UTILITY",
  language: "en_US",
  components: [
    { text: "Welcome", type: "HEADER", format: "TEXT" },
    { text: "Hi,\n\nYour new account has been created successfully.", type: "BODY" },
  ],
  parameter_format: "POSITIONAL",
};

export const mockHelloWorld: WhatsAppTemplate = {
  id: "1471813800305027",
  name: "hello_world",
  status: "APPROVED",
  category: "UTILITY",
  language: "en_US",
  components: [
    { text: "Hello World", type: "HEADER", format: "TEXT" },
    {
      text: "Welcome and congratulations!! This message demonstrates...",
      type: "BODY",
    },
    {
      text: "WhatsApp Business Platform sample message",
      type: "FOOTER",
    },
  ],
  parameter_format: "POSITIONAL",
};

// Optional array export for convenience
export const whatsappTemplateMocks = [
  mockSyncTest,
  mockLiquidTest,
  mockMediaTemplate,
  mockButtonTemplate,
  mockPaperfly,
  mockOpeth,
  mockTesting,
  mockCrmTest,
  mockChatTest,
  mockHelloWorld,
];
