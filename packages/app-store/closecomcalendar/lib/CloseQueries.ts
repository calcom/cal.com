const getContactSearchQuery = (contactEmails: string[]) => {
  return {
    limit: null,
    _fields: {
      contact: ["id", "name"],
    },
    query: {
      negate: false,
      queries: [
        {
          negate: false,
          object_type: "contact",
          type: "object_type",
        },
        {
          negate: false,
          queries: [
            {
              negate: false,
              related_object_type: "contact_email",
              related_query: {
                negate: false,
                queries: contactEmails.map((contactEmail) => ({
                  condition: {
                    mode: "full_words",
                    type: "text",
                    value: contactEmail,
                  },
                  field: {
                    field_name: "email",
                    object_type: "contact_email",
                    type: "regular_field",
                  },
                  negate: false,
                  type: "field_condition",
                })),
                type: "or",
              },
              this_object_type: "contact",
              type: "has_related",
            },
          ],
          type: "and",
        },
      ],
      type: "and",
    },
    results_limit: null,
    sort: [],
  };
};

export const contactQueries = {
  getContactSearchQuery,
};
