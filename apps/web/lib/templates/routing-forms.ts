import { v4 as uuidv4 } from "uuid";

export const routingForms = [
  // SALES ROUTING FORMS
  {
    id: "rf-1",
    name: "Enterprise Sales Qualification",
    description: "Route enterprise leads to the appropriate sales team based on company size and needs",
    image: "https://images.unsplash.com/photo-1552581234-26160f608093?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Sales"],
    relatedTemplateIds: ["rf-2", "rf-3", "rf-4"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Company Size",
          required: true,
          options: [
            { id: uuidv4(), label: "1-50" },
            { id: uuidv4(), label: "51-200" },
            { id: uuidv4(), label: "201-1000" },
            { id: uuidv4(), label: "1000+" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Primary Interest",
          required: true,
          options: [
            { id: uuidv4(), label: "Team Calendar" },
            { id: uuidv4(), label: "Enterprise Scheduling" },
            { id: uuidv4(), label: "API Integration" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "sales/enterprise",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "company_size",
                  value: [["1000+"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },
  {
    id: "rf-2",
    name: "Partner Program Routing",
    description: "Direct potential partners to appropriate partnership managers",
    image: "https://images.unsplash.com/photo-1553484771-371a605b060b?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Sales"],
    relatedTemplateIds: ["rf-1", "rf-3", "rf-4"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Partnership Type",
          required: true,
          options: [
            { id: uuidv4(), label: "Technology Integration" },
            { id: uuidv4(), label: "Reseller" },
            { id: uuidv4(), label: "Referral Partner" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "partnerships/tech",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "partnership_type",
                  value: [["Technology Integration"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // MARKETING ROUTING FORMS
  {
    id: "rf-3",
    name: "Content Marketing Request",
    description: "Route content requests to appropriate content team members",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Marketing"],
    relatedTemplateIds: ["rf-4", "rf-5", "rf-6"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Content Type",
          required: true,
          options: [
            { id: uuidv4(), label: "Blog Post" },
            { id: uuidv4(), label: "Case Study" },
            { id: uuidv4(), label: "White Paper" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Target Audience",
          required: true,
          options: [
            { id: uuidv4(), label: "Developers" },
            { id: uuidv4(), label: "Enterprise" },
            { id: uuidv4(), label: "Small Business" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "marketing/content-team",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "content_type",
                  value: [["Blog Post"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // EDUCATION ROUTING FORMS
  {
    id: "rf-4",
    name: "Academic Advisor Matching",
    description: "Match students with appropriate academic advisors based on their field of study",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Education"],
    relatedTemplateIds: ["rf-7", "rf-8", "rf-9"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Department",
          required: true,
          options: [
            { id: uuidv4(), label: "Computer Science" },
            { id: uuidv4(), label: "Business" },
            { id: uuidv4(), label: "Engineering" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Academic Year",
          required: true,
          options: [
            { id: uuidv4(), label: "Freshman" },
            { id: uuidv4(), label: "Sophomore" },
            { id: uuidv4(), label: "Junior" },
            { id: uuidv4(), label: "Senior" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "education/cs-advisor",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "department",
                  value: [["Computer Science"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // HEALTHCARE ROUTING FORMS
  {
    id: "rf-5",
    name: "Specialist Referral",
    description: "Route patients to appropriate medical specialists based on symptoms and conditions",
    image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Healthcare"],
    relatedTemplateIds: ["rf-10", "rf-11", "rf-12"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Specialty Needed",
          required: true,
          options: [
            { id: uuidv4(), label: "Cardiology" },
            { id: uuidv4(), label: "Orthopedics" },
            { id: uuidv4(), label: "Neurology" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Insurance Type",
          required: true,
          options: [
            { id: uuidv4(), label: "Private" },
            { id: uuidv4(), label: "Medicare" },
            { id: uuidv4(), label: "Medicaid" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "healthcare/cardiology",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "specialty",
                  value: [["Cardiology"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // Additional SALES forms
  {
    id: "rf-6",
    name: "Product Demo Request",
    description: "Route demo requests to product specialists based on feature interest",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Sales"],
    relatedTemplateIds: ["rf-1", "rf-2", "rf-3"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Product Features Interest",
          required: true,
          options: [
            { id: uuidv4(), label: "API Integration" },
            { id: uuidv4(), label: "Enterprise SSO" },
            { id: uuidv4(), label: "Custom Workflows" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Industry",
          required: true,
          options: [
            { id: uuidv4(), label: "Technology" },
            { id: uuidv4(), label: "Healthcare" },
            { id: uuidv4(), label: "Finance" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "sales/api-specialist",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "features",
                  value: [["API Integration"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },
  {
    id: "rf-7",
    name: "Sales Support Triage",
    description: "Route customer support requests to appropriate sales support team",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Sales"],
    relatedTemplateIds: ["rf-1", "rf-2", "rf-6"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Support Type",
          required: true,
          options: [
            { id: uuidv4(), label: "Billing" },
            { id: uuidv4(), label: "Product Questions" },
            { id: uuidv4(), label: "Contract Review" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "sales/billing-support",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "support_type",
                  value: [["Billing"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // Additional MARKETING forms
  {
    id: "rf-8",
    name: "Event Marketing Coordination",
    description: "Route event marketing requests to appropriate team members",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Marketing"],
    relatedTemplateIds: ["rf-3", "rf-9", "rf-10"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Event Type",
          required: true,
          options: [
            { id: uuidv4(), label: "Webinar" },
            { id: uuidv4(), label: "Conference" },
            { id: uuidv4(), label: "Workshop" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Marketing Support Needed",
          required: true,
          options: [
            { id: uuidv4(), label: "Social Media" },
            { id: uuidv4(), label: "Email Campaign" },
            { id: uuidv4(), label: "Landing Page" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "marketing/events-team",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "event_type",
                  value: [["Webinar"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },
  {
    id: "rf-9",
    name: "PR Request Routing",
    description: "Direct PR and media requests to appropriate team members",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Marketing"],
    relatedTemplateIds: ["rf-3", "rf-8", "rf-10"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Media Type",
          required: true,
          options: [
            { id: uuidv4(), label: "Press Release" },
            { id: uuidv4(), label: "Media Interview" },
            { id: uuidv4(), label: "Speaking Opportunity" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "marketing/pr-team",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "media_type",
                  value: [["Press Release"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // Additional EDUCATION forms
  {
    id: "rf-10",
    name: "Research Consultation",
    description: "Connect students with research advisors based on research interests",
    image: "https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Education"],
    relatedTemplateIds: ["rf-4", "rf-11", "rf-12"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Research Area",
          required: true,
          options: [
            { id: uuidv4(), label: "Data Science" },
            { id: uuidv4(), label: "Machine Learning" },
            { id: uuidv4(), label: "Blockchain" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "education/research-advisor",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "research_area",
                  value: [["Data Science"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },
  {
    id: "rf-11",
    name: "Career Services",
    description: "Route students to appropriate career counselors based on career interests",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Education"],
    relatedTemplateIds: ["rf-4", "rf-10", "rf-12"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Career Interest",
          required: true,
          options: [
            { id: uuidv4(), label: "Software Development" },
            { id: uuidv4(), label: "Data Analytics" },
            { id: uuidv4(), label: "Product Management" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "education/career-counselor",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "career_interest",
                  value: [["Software Development"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // Additional HEALTHCARE forms
  {
    id: "rf-12",
    name: "Mental Health Support",
    description: "Connect patients with appropriate mental health professionals",
    image: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Healthcare"],
    relatedTemplateIds: ["rf-5", "rf-13", "rf-14"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Type of Support",
          required: true,
          options: [
            { id: uuidv4(), label: "Anxiety" },
            { id: uuidv4(), label: "Depression" },
            { id: uuidv4(), label: "Stress Management" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "healthcare/mental-health",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "support_type",
                  value: [["Anxiety"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },
  {
    id: "rf-13",
    name: "Preventive Care Scheduling",
    description: "Route preventive care appointments to appropriate providers",
    image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Healthcare"],
    relatedTemplateIds: ["rf-5", "rf-12", "rf-14"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Service Type",
          required: true,
          options: [
            { id: uuidv4(), label: "Annual Physical" },
            { id: uuidv4(), label: "Vaccination" },
            { id: uuidv4(), label: "Health Screening" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "healthcare/preventive-care",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "service_type",
                  value: [["Annual Physical"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // Additional SALES form
  {
    id: "rf-14",
    name: "Contract Renewal Routing",
    description: "Route contract renewal discussions to appropriate account managers",
    image: "https://images.unsplash.com/photo-1554774853-719586f82d77?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Sales"],
    relatedTemplateIds: ["rf-1", "rf-2", "rf-6"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Current Contract Value",
          required: true,
          options: [
            { id: uuidv4(), label: "Under $10k" },
            { id: uuidv4(), label: "$10k-$50k" },
            { id: uuidv4(), label: "$50k+" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Additional Services Interest",
          required: true,
          options: [
            { id: uuidv4(), label: "Upgrade Package" },
            { id: uuidv4(), label: "Add Users" },
            { id: uuidv4(), label: "Custom Features" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "sales/enterprise-renewal",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "contract_value",
                  value: [["$50k+"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // Additional MARKETING form
  {
    id: "rf-15",
    name: "Influencer Collaboration",
    description: "Route influencer partnership requests to appropriate marketing team members",
    image: "https://images.unsplash.com/photo-1557838923-2985c318be48?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Marketing"],
    relatedTemplateIds: ["rf-8", "rf-9", "rf-3"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Platform Focus",
          required: true,
          options: [
            { id: uuidv4(), label: "Instagram" },
            { id: uuidv4(), label: "YouTube" },
            { id: uuidv4(), label: "TikTok" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Follower Range",
          required: true,
          options: [
            { id: uuidv4(), label: "10k-50k" },
            { id: uuidv4(), label: "50k-100k" },
            { id: uuidv4(), label: "100k+" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "marketing/influencer-partnerships",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "follower_range",
                  value: [["100k+"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // Additional EDUCATION form
  {
    id: "rf-16",
    name: "International Student Support",
    description: "Connect international students with appropriate support services",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Education"],
    relatedTemplateIds: ["rf-4", "rf-10", "rf-11"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Support Type Needed",
          required: true,
          options: [
            { id: uuidv4(), label: "Visa Support" },
            { id: uuidv4(), label: "Housing Assistance" },
            { id: uuidv4(), label: "Language Support" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Study Level",
          required: true,
          options: [
            { id: uuidv4(), label: "Undergraduate" },
            { id: uuidv4(), label: "Graduate" },
            { id: uuidv4(), label: "PhD" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "education/international-support",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "support_type",
                  value: [["Visa Support"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },

  // Additional HEALTHCARE form
  {
    id: "rf-17",
    name: "Rehabilitation Services",
    description: "Route patients to appropriate rehabilitation specialists",
    image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["Healthcare"],
    relatedTemplateIds: ["rf-5", "rf-12", "rf-13"],
    template: {
      fields: [
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Rehabilitation Type",
          required: true,
          options: [
            { id: uuidv4(), label: "Physical Therapy" },
            { id: uuidv4(), label: "Occupational Therapy" },
            { id: uuidv4(), label: "Speech Therapy" },
          ],
        },
        {
          id: uuidv4(),
          type: "multiselect",
          label: "Recovery Phase",
          required: true,
          options: [
            { id: uuidv4(), label: "Initial Assessment" },
            { id: uuidv4(), label: "Ongoing Treatment" },
            { id: uuidv4(), label: "Final Evaluation" },
          ],
        },
      ],
      routes: [
        {
          id: uuidv4(),
          action: {
            type: "eventTypeRedirectUrl",
            value: "healthcare/rehabilitation",
          },
          queryValue: {
            id: uuidv4(),
            type: "group",
            children1: {
              [uuidv4()]: {
                type: "rule",
                properties: {
                  field: "rehab_type",
                  value: [["Physical Therapy"]],
                  operator: "multiselect_equals",
                  valueSrc: ["value"],
                  valueType: ["multiselect"],
                },
              },
            },
          },
        },
      ],
    },
  },
];

export type RoutingForm = (typeof routingForms)[0];
