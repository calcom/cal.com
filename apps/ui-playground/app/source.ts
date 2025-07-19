// Simplified source without fumadocs to avoid compatibility issues
export const componentSource = {
  getPage: (_slug?: string[]) => {
    // Return a basic page structure for now
    return {
      url: "/design",
      data: {
        title: "Component Documentation",
        description: "Component documentation page",
        body: () => null, // Empty component
        toc: [],
        full: false,
      },
    };
  },
  generateParams: () => {
    return [];
  },
  pageTree: [],
};
