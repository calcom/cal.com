import type { TCreateInputSchema } from "@calcom/trpc/server/routers/viewer/eventTypes/create.schema";

export type TProfessionTypeAndEventTypes = {
  [key: string]: TCreateInputSchema[];
};

export const designationTypes: {
  [key: string]: string;
} = {
  recruiter: "Recruiter",
  sales: "Sales",
  founder: "Founder",
  freelancer: "Freelancer",
  education: "Education",
  health: "Health",
  mentor: "Mentor",
  others: "Others",
};
export const professionTypeAndEventTypes: TProfessionTypeAndEventTypes = {
  recruiter: [
    {
      title: "intitial_screening",
      slug: "intitial_screening",
      description: "intitial_screening_meeting_description",
      length: [15, 30],
    },
    {
      title: "collaborative_evaluation",
      slug: "collaborative_evaluation",
      description: "collaborative_evaluation_meeting_description",
      length: [30, 45],
    },
    {
      title: "offer_dicussion",
      slug: "offer_dicussion",
      description: "offer_dicussion_meeting_description",
      length: [15, 30],
    },
    {
      title: "campus_relations",
      slug: "campus_relations",
      description: "campus_relations_meeting_description",
      length: [30, 45],
    },
    {
      title: "staffing_and_consultants",
      slug: "staffing_and_consultants",
      description: "staffing_and_consultants_meeting_description",
      length: [15, 30, 45],
    },
    {
      title: "everything_else",
      slug: "everything_else",
      description: "everything_else_recruiter_meeting_description",
      length: [15, 30],
    },
  ],
  sales: [
    {
      title: "discovery_call",
      slug: "discovery_call",
      description: "discovery_call_meeting_description",
      length: [15, 30],
    },
    {
      title: "product_demo",
      slug: "product_demo",
      description: "product_demo_meeting_description",
      length: [30, 45],
    },
    {
      title: "proposal_review",
      slug: "proposal_review",
      description: "proposal_review_meeting_description",
      length: [30, 45],
    },
    {
      title: "account_checkin",
      slug: "account_checkin",
      description: "account_checkin_meeting_description",
      length: [15, 30],
    },
    {
      title: "everything_else",
      slug: "everything_else",
      description: "everything_else_sales_meeting_description",
      length: [15, 30],
    },
  ],
  founder: [
    {
      title: "interview",
      slug: "interview",
      description: "interview_meeting_description",
      length: [15, 30],
    },
    {
      title: "partnership",
      slug: "partnership",
      length: [15, 30],
      description: "partnership_meeting_description",
    },
    {
      title: "raise_funding",
      slug: "raise_funding",
      description: "raise_funding_meeting_description",
      length: [30, 45],
    },
    {
      title: "product_walkthrough",
      slug: "product_walkthrough",
      description: "product_walkthrough_meeting_description",
      length: [15, 30],
    },
    {
      title: "connect_with_founder",
      slug: "connect_with_founder",
      description: "connect_with_founder_meeting_description",
      length: [15, 30],
    },
  ],
  freelancer: [
    {
      title: "project_briefing",
      slug: "project_briefing",
      description: "project_briefing_meeting_description",
      length: [15, 30],
    },
    {
      title: "technical_consultation",
      slug: "technical_consultation",
      description: "technical_consultation_meeting_description",
      length: [30, 45],
    },
    {
      title: "creative_collaration",
      slug: "creative_collaration",
      description: "creative_collaration_meeting_description",
      length: [30, 60],
    },
    {
      title: "portfolio_showcase",
      slug: "portfolio_showcase",
      description: "portfolio_showcase_meeting_description",
      length: [15, 30],
    },
    {
      title: "skillset_expansion",
      slug: "skillset_expansion",
      description: "skillset_expansion_meeting_description",
      length: [30, 45],
    },
    {
      title: "everything_else",
      slug: "everything_else",
      description: "everything_else_freelancer_meeting_description",
      length: [30, 45],
    },
  ],
  education: [
    {
      title: "introductory_call",
      slug: "introductory_call",
      description: "introductory_call_meeting_description",
      length: [15, 30],
    },
    {
      title: "group_session",
      slug: "group_session",
      description: "group_session_meeting_description",
      length: [30, 60],
    },
    {
      title: "skills_workshop",
      slug: "skills_workshop",
      description: "skills_workshop_meeting_description",
      length: [30, 45, 60],
    },
    {
      title: "one_on_one_coaching",
      slug: "one_on_one_coaching",
      description: "one_on_one_coaching_meeting_description",
      length: [30, 45, 60],
    },
    {
      title: "mocktest_and_feedback",
      slug: "mocktest_and_feedback",
      description: "mocktest_and_feedback_meeting_description",
      length: [45, 60],
    },
    {
      title: "career_counselling",
      slug: "career_counselling",
      description: "career_counselling_meeting_description",
      length: [45, 60],
    },
    {
      title: "everything_else",
      slug: "everything_else",
      description: "everything_else_education_meeting_description",
      length: [15, 30],
    },
  ],
  health: [
    {
      title: "intial_consultation",
      slug: "intial_consultation",
      description: "intial_consultation_meeting_description",
      length: [15, 30],
    },
    {
      title: "yoga_session",
      slug: "yoga_session",
      description: "yoga_session_meeting_description",
      length: [30, 45, 60],
    },
    {
      title: "fitness_coaching",
      slug: "fitness_coaching",
      description: "fitness_coaching_meeting_description",
      length: [30, 45, 60],
    },
    {
      title: "nutrition_planning",
      slug: "nutrition_planning",
      description: "nutrition_planning_meeting_description",
      length: [30, 45],
    },
    {
      title: "mental_health_consultation",
      slug: "mental_health_consultation",
      description: "mental_health_consultation_meeting_description",
      length: [30, 45],
    },
    {
      title: "followup_appointment",
      slug: "followup_appointment",
      description: "followup_appointment_meeting_description",
      length: [15, 30],
    },
    {
      title: "holistic_wellness",
      slug: "holistic_wellness",
      description: "holistic_wellness_meeting_description",
      length: [30, 45],
    },
    {
      title: "everything_else",
      slug: "everything_else",
      description: "everything_else_health_meeting_description",
      length: [15, 30],
    },
  ],
  mentor: [
    {
      title: "introductory_call",
      slug: "introductory_call",
      description: "mentor_introductory_call_meeting_description",
      length: [30],
    },
    {
      title: "deep_dive_call",
      slug: "deep_dive_call",
      description: "deep_dive_call_meeting_description",
      length: [60],
    },
  ],
  others: [
    { title: "15min_meeting", slug: "15min", length: [15] },
    {
      title: "30min_meeting",
      slug: "30min",
      length: [30],
    },
    {
      title: "secret_meeting",
      slug: "secret",
      length: [15],
      hidden: true,
    },
  ],
};
export const customEvents: {
  [key: string]: string;
} = {
  intitial_screening: "Initial Screening",
  intitial_screening_meeting_description:
    "📅 Embark on an exciting path with your first step at our company! Schedule your initial screening, a friendly chat where we get to know each other and discuss the potential ahead. Let’s break the ice! 🌟",
  collaborative_evaluation: "Collaborative Evaluation",
  collaborative_evaluation_meeting_description:
    "Ready for the next leap? 🚀 Join us in a collaborative evaluation where you'll meet the team and showcase your skills. Whether it’s a technical deep-dive or a strategy session with the hiring manager, let’s make it count! 🤝",
  offer_dicussion: "Offer Discussion",
  offer_dicussion_meeting_description:
    "Let's seal the deal! 📃 Schedule a time to chat about the exciting offer we have on the table. We're ready to welcome you aboard! 💼✨",
  campus_relations: "Campus Relations",
  campus_relations_meeting_description:
    "Campus stars wanted! 🌟 Connect with us to bring top talent from academia to the forefront of industry innovation. Let’s empower the next generation together!",
  staffing_and_consultants: "Staffing and Consultants",
  staffing_and_consultants_meeting_description:
    "Building teams that build the future. 🚀 Partner with us to find the best talent and solutions for our clients. Your expertise can make all the difference! 💡",
  everything_else: "Everything Else",
  everything_else_recruiter_meeting_description:
    "Got questions? Ideas? Just want to talk shop? 🗣️ I’m all ears! Let’s open the dialogue for collaborations, advice, or simply to exchange insights! 🌐🤝",
  discovery_call: "Discovery Call",
  discovery_call_meeting_description:
    "📞 Spark the conversation! Book a discovery call and let's unearth opportunities to drive your business forward. It’s time to align our visions and start a successful journey. Let's ignite the potential! 🔍",
  product_demo: "Product Demo",
  product_demo_meeting_description:
    "🖥️ Witness innovation in action! Reserve a time for a personalized demo of our cutting-edge solutions tailored to your business needs. Experience the future of technology today. Dive in! 🌐",
  proposal_review: "Proposal Review",
  proposal_review_meeting_description:
    "📄 Let’s get down to details. Schedule a session to walk through our tailored proposal and iron out the fine print. Your success story is just a proposal away. Let’s craft it together! ✍️",
  account_checkin: "Account Check-in",
  account_checkin_meeting_description:
    "🔄 Stay on the pulse of progress! Existing partners can schedule an account check-in to ensure we’re hitting all targets and exploring new avenues for growth. Your continued success is our commitment. 📈",
  everything_else_sales_meeting_description:
    "🌐 Open Agenda! If your needs don’t quite fit the categories above, no problem. Let’s discuss how we can tailor our services for your unique challenges or simply brainstorm over coffee. Whatever it is, I’m all ears! 💡",
  interview: "Interview",
  interview_meeting_description:
    "Elevate your career to new heights! 📅 Schedule a call and discover the incredible opportunities awaiting you with us!",
  partnership: "Partnership",
  partnership_meeting_description:
    "🌟 Join forces with us for an unbeatable partnership!. Together, we'll reach new heights of success and innovation! ✨",
  raise_funding: "Raise Funding",
  raise_funding_meeting_description:
    "If you're a VC or Angel investor seeking a standout startup to back, look no further. We're raising now 🚀 and primed for exponential growth.",
  product_walkthrough: "Product Walkthrough",
  product_walkthrough_meeting_description:
    "🚀 Whether you're a curious user or a potential partner, join us for an immersive exploration of what sets our offering apart. Let's unlock possibilities together! 🔍",
  connect_with_founder: "Connect with Founder",
  connect_with_founder_meeting_description:
    "Let's connect for an interactive session! Whether it's for exchanging ideas, exploring collaborations, or simply saying hello.🌟🤝",
  project_briefing: "Project Briefing",
  project_briefing_meeting_description:
    "👨‍💻 Got a vision? Let’s bring it to life! Book a project briefing to explore your ideas and map out a development or design plan that turns them into digital reality. It’s where creativity meets code. 🎨",
  technical_consultation: "Technical Consultation",
  technical_consultation_meeting_description:
    "💻 Stuck on a bug or need tech advice? Dive into a technical consultation where we tackle your challenges head-on. Whether it's code complexities or design dilemmas, I’m here to help you navigate through. 🛠️",
  creative_collaration: "Creative Collaboration",
  creative_collaration_meeting_description:
    "🤝 Seeking a creative partner? Join me for a session to brainstorm and blend our talents. It’s all about synergizing design flair with tech innovation to create something spectacular. Let’s co-create! ✨",
  portfolio_showcase: "Portfolio Showcase",
  portfolio_showcase_meeting_description:
    "🖼️ Curious about my work? Schedule a time to browse through my portfolio. Discover the projects that showcase my expertise and passion. Let's start the conversation and inspire your next project. 🌟",
  skillset_expansion: "Skillset Expansion",
  skillset_expansion_meeting_description:
    "📚 Looking to level up? Whether you're expanding your skills or diving into a new domain, let's chat about mentoring, courses, or simply exchanging knowledge. Grow your skill set with tailored guidance. 🚀",
  everything_else_freelancer_meeting_description:
    "💼 Got a unique project or idea that's outside the usual scope? Let's discuss it! Whether you need advice, a fresh perspective, or just want to explore unconventional approaches, I'm here to dive into the details and find creative solutions. Let’s tackle the unexpected together! 🌟",
  introductory_call: "Introductory Call",
  introductory_call_meeting_description:
    "📘 Kick off your learning journey with a course introduction! Discover the curriculum, discuss your goals, and see how our sessions can propel you towards success. Your path to knowledge starts here!",
  group_session: "Group Session",
  group_session_meeting_description:
    "📚 Dive into focused study sessions tailored to your educational needs. Whether it’s tackling tough concepts or preparing for exams, let’s make every minute count. Together, we learn and conquer!",
  skills_workshop: "Skills Workshop",
  skills_workshop_meeting_description:
    "🛠️ Ready to master a new skill? Join our interactive workshops where hands-on learning takes the front seat. From coding to creative writing, expand your horizons in a collaborative setting.",
  one_on_one_coaching: "One-on-One Coaching",
  one_on_one_coaching_meeting_description:
    "👤 Personalize your growth with one-on-one coaching. Here, it’s all about you and your learning objectives. Whether it's career advice or subject-specific guidance, I’m here to mentor you to the peak of your potential.",
  mocktest_and_feedback: "Mock Test and Feedback",
  mocktest_and_feedback_meeting_description:
    "✍️ Test your knowledge under real exam conditions with a mock test, followed by comprehensive feedback to sharpen your abilities and boost your confidence. Let’s turn your hard work into high scores!",
  career_counselling: "Career Counselling",
  career_counselling_meeting_description:
    "🎓 Contemplating the next steps in your academic or professional journey? Let’s explore your interests, evaluate opportunities, and carve out a path that leads you to your dream career.",
  everything_else_education_meeting_description:
    "🌐 If you have a unique educational need, want to discuss collaborative opportunities, or simply have questions, this is your slot. Let’s connect and explore the endless possibilities in the world of education!",
  intial_consultation: "Initial Consultation",
  intial_consultation_meeting_description:
    "🩺 Embark on a journey to better health! Schedule your initial consultation to discuss your health goals, challenges, and tailor a plan that guides you towards wellness. Together, we'll map out the path to a healthier you.",
  yoga_session: "Yoga Session",
  yoga_session_meeting_description:
    "🧘‍♀️ Dive deep into tranquility and strength with a personalized yoga session. Whether you’re a beginner or looking to deepen your practice, let’s embrace balance, flexibility, and peace together. Namaste!",
  fitness_coaching: "Fitness Coaching",
  fitness_coaching_meeting_description:
    "💪 Ready to transform your body and mind? Book a fitness coaching session to jumpstart your journey towards your fitness goals. Custom workouts, nutrition guidance, and motivational support await!",
  nutrition_planning: "Nutrition Planning",
  nutrition_planning_meeting_description:
    "🍏 Unlock the power of nutrition! Schedule a session to craft a personalized eating plan that nourishes your body, fuels your activities, and aligns with your wellness objectives. Let's eat smart, live well!",
  mental_health_consultation: "Mental Health Consultation",
  mental_health_consultation_meeting_description:
    "🧠 Prioritize your mental well-being. Connect for a mental health check to discuss stress management, coping strategies, or anything on your mind in a supportive and confidential environment. Your mental health matters.",
  followup_appointment: "Follow-up Appointment",
  followup_appointment_meeting_description:
    "📅 Keep your health journey on track with a follow-up appointment. Assess progress, adjust plans, and celebrate victories. Continuous support for your ongoing wellness and health achievements.",
  holistic_wellness: "Holistic Wellness",
  holistic_wellness_meeting_description:
    "✨ Explore holistic healing practices to complement your wellness journey. From meditation to natural remedies, discover how integrative techniques can enhance your health and overall well-being.",
  everything_else_health_meeting_description:
    "🌿 Have a unique health or wellness question, interested in a collaboration, or just looking to chat about your journey? Book this time for anything else on your mind. Let’s cultivate health together!",
  mentor_introductory_call_meeting_description:
    "📘 Start your mentoring journey with an introductory call. We'll discuss your goals, explore your potential, and set the stage for a fruitful mentoring relationship. Let's begin your path to growth!",
  deep_dive_call: "Deep Dive Call",
  deep_dive_call_meeting_description:
    "🔍 Dive deeper into your development with a focused deep dive call. Together, we'll tackle complex challenges, refine your skills, and chart a clear path forward for your growth. Let’s unlock your full potential!",
};
