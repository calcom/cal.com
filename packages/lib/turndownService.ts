import TurndownService from "turndown";

const turndownService = new TurndownService();

turndownService.addRule("newLine", {
  filter: ["br"],
  replacement: () => {
    return "<p><br></p>";
  },
});

export default turndownService;
