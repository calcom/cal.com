export const eventTypes = [
  // SALES TEMPLATES
  {
    id: "et-1",
    name: "Discovery Call",
    description: "30 minute initial sales discovery call",
    image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["sales", "1:1"],
    relatedTemplateIds: ["et-2", "et-3", "et-4"],
    template: {
      title: "Discovery Call",
      slug: "discovery-call",
      length: 30,
      description: "Initial sales qualification meeting",
    },
  },
  {
    id: "et-2",
    name: "Sales Pipeline Review",
    description: "45 minute sales pipeline and forecast discussion",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["sales", "review"],
    relatedTemplateIds: ["et-1", "et-3", "et-4"],
    template: {
      title: "Pipeline Review",
      slug: "pipeline-review",
      length: 45,
      description: "Comprehensive pipeline review session",
    },
  },
  {
    id: "et-3",
    name: "Product Demo",
    description: "60 minute product demonstration and Q&A",
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["sales", "demo", "marketing"],
    relatedTemplateIds: ["et-1", "et-2", "et-4"],
    template: {
      title: "Product Demo",
      slug: "product-demo",
      length: 60,
      description: "In-depth product demonstration",
    },
  },
  {
    id: "et-4",
    name: "Contract Review",
    description: "45 minute contract review and negotiation",
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["sales", "legal"],
    relatedTemplateIds: ["et-1", "et-2", "et-3"],
    template: {
      title: "Contract Review",
      slug: "contract-review",
      length: 45,
      description: "Final contract review and discussion",
    },
  },

  // MARKETING TEMPLATES
  {
    id: "et-5",
    name: "Campaign Strategy",
    description: "60 minute marketing campaign planning",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["marketing", "strategy"],
    relatedTemplateIds: ["et-6", "et-7", "et-8"],
    template: {
      title: "Campaign Strategy",
      slug: "campaign-strategy",
      length: 60,
      description: "Marketing campaign planning session",
    },
  },
  {
    id: "et-6",
    name: "Content Review",
    description: "30 minute content review and approval",
    image: "https://images.unsplash.com/photo-1512314889357-e157c22f938d?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["marketing", "content"],
    relatedTemplateIds: ["et-5", "et-7", "et-8"],
    template: {
      title: "Content Review",
      slug: "content-review",
      length: 30,
      description: "Marketing content review session",
    },
  },
  {
    id: "et-7",
    name: "Analytics Review",
    description: "45 minute marketing metrics analysis",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["marketing", "analytics", "sales"],
    relatedTemplateIds: ["et-5", "et-6", "et-8"],
    template: {
      title: "Analytics Review",
      slug: "analytics-review",
      length: 45,
      description: "Marketing performance analysis",
    },
  },
  {
    id: "et-8",
    name: "Brand Workshop",
    description: "90 minute brand strategy workshop",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["marketing", "workshop"],
    relatedTemplateIds: ["et-5", "et-6", "et-7"],
    template: {
      title: "Brand Workshop",
      slug: "brand-workshop",
      length: 90,
      description: "Comprehensive brand strategy session",
    },
  },

  // EDUCATION TEMPLATES
  {
    id: "et-9",
    name: "Academic Advising",
    description: "45 minute academic planning session",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["education", "1:1"],
    relatedTemplateIds: ["et-10", "et-11", "et-12"],
    template: {
      title: "Academic Advising",
      slug: "academic-advising",
      length: 45,
      description: "Student academic planning session",
    },
  },
  {
    id: "et-10",
    name: "Tutorial Session",
    description: "60 minute one-on-one tutoring",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["education", "tutoring"],
    relatedTemplateIds: ["et-9", "et-11", "et-12"],
    template: {
      title: "Tutorial Session",
      slug: "tutorial",
      length: 60,
      description: "One-on-one tutoring session",
    },
  },
  {
    id: "et-11",
    name: "Research Consultation",
    description: "30 minute research guidance meeting",
    image: "https://images.unsplash.com/photo-1532619187608-e5375cab36aa?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["education", "research"],
    relatedTemplateIds: ["et-9", "et-10", "et-12"],
    template: {
      title: "Research Consultation",
      slug: "research-consultation",
      length: 30,
      description: "Research project guidance session",
    },
  },
  {
    id: "et-12",
    name: "Career Counseling",
    description: "45 minute career guidance session",
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["education", "career", "consulting"],
    relatedTemplateIds: ["et-9", "et-10", "et-11"],
    template: {
      title: "Career Counseling",
      slug: "career-counseling",
      length: 45,
      description: "Career planning and guidance session",
    },
  },

  // HEALTHCARE TEMPLATES
  {
    id: "et-13",
    name: "Initial Consultation",
    description: "30 minute initial medical consultation",
    image: "https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["healthcare", "consultation"],
    relatedTemplateIds: ["et-14", "et-15", "et-16"],
    template: {
      title: "Initial Consultation",
      slug: "initial-consultation",
      length: 30,
      description: "First-time patient consultation",
    },
  },
  {
    id: "et-14",
    name: "Follow-up Visit",
    description: "20 minute follow-up appointment",
    image: "https://images.unsplash.com/photo-1584982751601-97dcc096659c?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["healthcare", "follow-up"],
    relatedTemplateIds: ["et-13", "et-15", "et-16"],
    template: {
      title: "Follow-up Visit",
      slug: "follow-up-visit",
      length: 20,
      description: "Regular follow-up appointment",
    },
  },
  {
    id: "et-15",
    name: "Wellness Check",
    description: "45 minute comprehensive wellness review",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["healthcare", "wellness", "education"],
    relatedTemplateIds: ["et-13", "et-14", "et-16"],
    template: {
      title: "Wellness Check",
      slug: "wellness-check",
      length: 45,
      description: "Comprehensive wellness assessment",
    },
  },
  {
    id: "et-16",
    name: "Telemedicine Visit",
    description: "25 minute virtual healthcare consultation",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=800",
    author: {
      name: "Cal.com",
      avatar: "/cal.png",
    },
    tags: ["healthcare", "virtual"],
    relatedTemplateIds: ["et-13", "et-14", "et-15"],
    template: {
      title: "Telemedicine Visit",
      slug: "telemedicine",
      length: 25,
      description: "Virtual healthcare consultation",
    },
  },
];

export type EventType = (typeof eventTypes)[0];
