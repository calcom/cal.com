import Link from "next/link";

export const ABOUT = {
  name: "Jean-Gabriel Young",
  email: "jean-gabriel.young@uvm.edu",
  role: "Assistant Professor",
  company: "Department of Mathematics and Statistics, The University of Vermont",
  avatar_url: "https://www.jgyoung.ca/img/jgyoung.png",
  call_charges: "300",
  links: [
    {
      type: "twitter_url",
      href: "http://www.twitter.com/_jgyou",
      name: "Twitter",
    },
    {
      type: "generic_url",
      href: "https://arxiv.org/a/young_j_1.html",
      name: "arXiv.org",
    },
    {
      type: "generic_url",
      href: "https://scholar.google.ca/citations?user=qmKcNSoAAAAJ&amp;hl=en",
      name: "Google Scholar",
    },
    {
      type: "generic_url",
      href: "https://www.researchgate.net/profile/Jean_Gabriel_Young",
      name: "ResearchGate",
    },
    {
      type: "generic_url",
      href: "https://impactstory.org/u/0000-0002-4464-2692",
      name: "Impactstory",
    },
    {
      type: "generic_url",
      href: "http://orcid.org/0000-0002-4464-2692",
      name: "ORCID",
    },
    { type: "github_url", href: "https://github.com/jg-you/", name: "" },
    {
      type: "stackexchange_url",
      href: "http://stackexchange.com/users/2079477/jgyou?tab=accounts",
      name: "",
    },
    {
      type: "generic_url",
      href: "https://www.webofscience.com/wos/author/record/1689626",
      name: "Web of Science",
    },
    {
      type: "generic_url",
      href: "https://aur.archlinux.org/account/jg-you/",
      name: "AUR",
    },
    {
      type: "linkedin_url",
      href: "https://www.linkedin.com/in/jean-gabriel-young-69857759/",
      name: "",
    },
  ],
};

export const BIO = (
  <>
    <p>
      Dr. Jean-Gabriel Young is an Assistant Professor of Mathematics and Statistics at The University of
      Vermont and a data science advisor for <Link href="https://hive.one/">Hive.one</Link>. Before that, he
      was a <Link href="https://www.jsmf.org/programs/cs/">James S. McDonnell Foundation Fellow</Link> at the{" "}
      <Link href="https://lsa.umich.edu/cscs">
        University of Michigan&apos;s Center for the Study of Complex Systems
      </Link>
      , mentored by <Link href="http://www-personal.umich.edu/~mejn/">Prof. Mark Newman</Link>. He has been
      working for 10+ year at the intersection of data science, network science, and complex systems.
    </p>
    <p>Here&apos;s what I can advise on:</p>
    <ul>
      <li>Network science</li>
      <li>Complex systems</li>
      <li>Bayesian data analysis</li>
      <li>Statistical inference</li>
      <li>Research and academia</li>
      <li>Academics in tech</li>
    </ul>
    <p>
      I&apos;m excited to meet you and help you on your journey, whether it&apos;s understanding the basics of
      data science or discussing the latest trends network science in graph learning. Let&apos;s chat!
    </p>
  </>
);

export const FACTS = [
  {
    title: "JSMF fellow",
    description: "Understanding Dynamic & Multi-Scale Systems program",
    href: "#",
  },
  {
    title: "Published in Nature Physics, Science Advances, Physics Reports",
    description: "And 100+ publication in other journals",
    href: "#",
  },
  {
    title: "12 years in network science",
    description: "Collaborating with researchers from 7 countries",
    href: "",
  },
  {
    title: "Industry collaboration",
    description: "Working with companies and research labs",
    href: "#",
  },
];

export const ADVISETOPICS = [
  { title: "Network science", href: "#" },
  { title: "Complex systems", href: "#" },
  { title: "Bayesian data analysis", href: "#" },
  { title: "Statistical inference", href: "#" },
  { title: "Research and academia", href: "#" },
  { title: "Academics in tech", href: "#" },
];

export const PROJECTS = [
  {
    title: "plant-pollinator-inference",
    description: (
      <>
        <code>stan</code> model to infer the network structure that best explains observational data of
        plant-pollinator interactions. Model described in{" "}
        <Link href="https://www.biorxiv.org/content/10.1101/754077v1">this preprint.</Link>
      </>
    ),
    href: "https://github.com/jg-you/plant-pollinator-inference/",
  },
  {
    title: "AstroPhysicsAnalysis",
    description: (
      <>
        Toolset developed in <code>Matlab</code> for analyzing astrophysical data. Detailed research
        methodologies can be found in this{" "}
        <Link href="https://www.biorxiv.org/content/10.1101/754084v1">
          <em>research paper.</em>
        </Link>
      </>
    ),
    href: "https://github.com/jg-you/AstroPhysicsAnalysis/",
  },
  {
    title: "DNASequencingAI",
    description: (
      <>
        <em>Artificial Intelligence</em> based system for predicting DNA sequences developed in{" "}
        <code>Python</code>. More information available in this{" "}
        <Link href="https://www.biorxiv.org/content/10.1101/754085v1">research article.</Link>
      </>
    ),
    href: "https://github.com/jg-you/DNASequencingAI/",
  },
  {
    title: "EcoSystemModel",
    description: (
      <>
        Simulation of various ecosystems using <code>C++</code>. Refer to this{" "}
        <Link href="https://www.biorxiv.org/content/10.1101/754086v1">
          <em>paper</em>
        </Link>{" "}
        for a detailed description.
      </>
    ),
    href: "https://github.com/jg-you/EcoSystemModel/",
  },
  {
    title: "BioInformaticsToolkit",
    description: (
      <>
        A comprehensive toolkit for bioinformatics research developed using <code>R</code>. Detailed in this{" "}
        <Link href="https://www.biorxiv.org/content/10.1101/754087v1">preprint.</Link>
      </>
    ),
    href: "https://github.com/jg-you/BioInformaticsToolkit/",
  },
];

export const EXPERIENCE = [
  {
    institution: "Université Laval",
    roles: [
      {
        position: "Assistant Professor, Department of Physics",
        startDate: new Date(2018, 7),
        endDate: new Date(2011, 7),
      },
      {
        position: "Teaching Assistant",
        startDate: new Date(2011, 4),
        endDate: new Date(2011, 7),
      },
      {
        position: "Teaching Assistant",
        startDate: new Date(2011, 4),
        endDate: new Date(2011, 7),
      },
    ],
  },
  {
    institution: "Université Laval",
    roles: [
      {
        position: "Assistant Professor, Department of Physics",
        startDate: new Date(2018, 7),
        endDate: new Date(2011, 7),
      },
      {
        position: "Teaching Assistant",
        startDate: new Date(2011, 4),
        endDate: new Date(2011, 7),
      },
      {
        position: "Teaching Assistant",
        startDate: new Date(2011, 4),
        endDate: new Date(2011, 7),
      },
    ],
  },
];

export const PUBLICATIONS = [
  {
    title: "Latent network models to account for noisy, multiply-reported social network data",
    description:
      "C. De Bacco, M. Contisciani, J. Cardoso-Silva, H. Safdari, G. Borges, D. Baptista, T. Sweet, J.-G. Young, J. Koster, C. T. Ross, R. McElreath, D. Redhead, and E. A. Power\nJ. R. Stat. Soc. A, qnac004(2023)",

    links: [
      {
        label: "arXiv.org",
        href: "https://www.jgyoung.ca/publications.html#:~:text=A%2C%20qnac004(2023)-,arXiv.org,-%7C%20Journal%20%20%7C",
      },
      { label: "Journal", href: "https://doi.org/10.1093/jrsssa/qnac004" },
      { label: "Software", href: "https://latentnetworks.github.io/vimure/" },
    ],
  },
  {
    title: "Opposing responses to scarcity emerge from functionally unique sociality drivers",
    description:
      "A. B. Kao, A. K. Hund, F. P. Santos, J.-G. Young, D. Bhat, J. Garland, R. A. Oomen, and H. F. McCreery\nAm. Nat. (in press)",
    links: [
      {
        label: "bioRxiv",
        href: "https://dx.doi.org/10.1101/2020.03.17.994343",
      },
    ],
  },
];
