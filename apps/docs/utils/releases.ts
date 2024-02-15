import grayMatter from "gray-matter";
import { parseISO } from "date-fns";
import { TagColor } from "@utils/colors";

export enum Tag {
  Publishing = "Publishing",
  LanguageSupport = "LanguageSupport",
  Performance = "Performance",
  Data = "Data",
  API = "API",
  Framework = "Framework",
  CSS = "CSS",
  Editor = "Editor",
  Components = "Components",
  Billing = "Billing",
  Teams = "Teams",
  Resources = "Resources",
  Community = "Community",
  Improvements = "Improvements",
  Bugfixes = "Bugfixes",
}

export const getColor = (tag: Tag) => {
  switch (tag) {
    case Tag.Publishing:
    case Tag.Framework:
    case Tag.Improvements:
    case Tag.Editor:
      return TagColor.sky;
    case Tag.Performance:
      return TagColor.amber;
    case Tag.Components:
    case Tag.CSS:
    case Tag.Community:
    case Tag.Resources:
      return TagColor.green;
    case Tag.Data:
    case Tag.API:
    case Tag.Teams:
    case Tag.Billing:
    case Tag.Bugfixes:
      return TagColor.violet;
    default:
      return TagColor.neutral;
  }
};

type Feature = {
  tag?: Tag;
  body: string;
};

type Release = {
  date: Date;
  features?: Feature[];
  improvements?: string[];
  bugfixes?: string[];
};

/*
We do a rudimentary parsing of release notes to avoid loading
a full Markdown parser. This will eventually be streamlined by
plugins. For now, we assume release notes have a fixed format
of the form:

```
---
date: 2022-01-01
---

# Features

- #tag Feature 1
- #tag Feature 2

# Bugfixes

- Bugfix 1
- Bugfix 2
```
*/

const FEATURES_HEADING = "# Features";
const IMPROVEMENTS_HEADING = "# Improvements";
const BUGFIXES_HEADING = "# Bugfixes";

export const parseReleaseText = (text: string): Release | undefined => {
  const matter = grayMatter(text);
  if (!matter?.data?.date) {
    return undefined;
  }

  let date = new Date();
  try {
    date = parseISO(matter.data.date);
  } catch {}

  let featuresText = "";
  let improvementsText = "";
  let bugfixText = "";

  const splitFeatures = text.split(FEATURES_HEADING);
  if (splitFeatures.length > 1) {
    const afterFeaturesHeading = splitFeatures[1].trim();
    const splitImprovements = afterFeaturesHeading.split(IMPROVEMENTS_HEADING);
    featuresText = splitImprovements[0].trim();
    if (splitImprovements.length > 1) {
      const afterImprovementsHeading = splitImprovements[1].trim();
      const splitBugfixes = afterImprovementsHeading.split(BUGFIXES_HEADING);
      improvementsText = splitBugfixes[0].trim();
      if (splitBugfixes.length > 1) {
        bugfixText = splitBugfixes[1].trim();
      }
    }
  }
  return {
    date,
    features: getFeatureList(featuresText),
    improvements: getItemList(improvementsText),
    bugfixes: getItemList(bugfixText),
  };
};

const toTag = (tagString: string): Tag | undefined => {
  const found = Object.keys(Tag).find((k) => k.toLowerCase() === tagString);
  if (found) {
    return found as Tag;
  }
  return undefined;
};

const toFeature = (line: string): Feature | undefined => {
  let l = line.replace(/^- /, "").trim();
  const match = l.match(/^#(\w+)\s(.*)/);
  let tag: Tag | undefined = undefined;
  if (match) {
    tag = toTag(match[1]);
    l = match[2];
  }
  if (l?.length > 0) {
    return { body: l, tag };
  }
  return undefined
};

const getFeatureList = (featuresText: string): Feature[] => {
  return featuresText
    .trim()
    .split("\n")
    .map(toFeature)
    .filter(Boolean) as Feature[];
};

const getItemList = (text: string): string[] => {
  return text
    .trim()
    .split("\n")
    .map((l) => l.replace(/^- /, "").trim())
    .filter(Boolean);
};
