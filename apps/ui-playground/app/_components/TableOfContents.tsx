"use client";

import { useEffect, useState } from "react";

import { Button, Input } from "@calcom/ui";

type Section = {
  id: string;
  title: string;
  subsections?: { id: string; title: string }[];
};

const sections: Section[] = [
  {
    id: "alert",
    title: "Alert",
    subsections: [
      { id: "alert-basic", title: "Basic" },
      { id: "alert-with-actions", title: "With Actions" },
      { id: "alert-custom-icons", title: "Custom Icons" },
      { id: "alert-custom-icon-colors", title: "Custom Icon Colors" },
      { id: "alert-no-title", title: "Without Title" },
    ],
  },
  {
    id: "avatar",
    title: "Avatar",
    subsections: [
      { id: "avatar-sizes", title: "Size Variations" },
      { id: "avatar-images", title: "With/Without Image" },
      { id: "avatar-tooltip", title: "With Tooltip" },
      { id: "avatar-link", title: "With Link" },
      { id: "avatar-indicator", title: "With Indicator" },
    ],
  },
  {
    id: "badge",
    title: "Badge",
    subsections: [
      { id: "badge-variants", title: "Variants" },
      { id: "badge-icons", title: "With Icons" },
      { id: "badge-dots", title: "With Dots" },
      { id: "badge-interactive", title: "Interactive" },
      { id: "badge-rounded", title: "Rounded" },
    ],
  },
  {
    id: "button",
    title: "Button",
    subsections: [
      { id: "button-default", title: "Default" },
      { id: "button-icon", title: "Icon" },
      { id: "button-fab", title: "Fab" },
      { id: "button-icons", title: "With Icons" },
      { id: "button-loading", title: "Loading State" },
      { id: "button-disabled", title: "Disabled State" },
      { id: "button-link", title: "As Link" },
    ],
  },
  {
    id: "checkbox",
    title: "Checkbox",
    subsections: [
      { id: "checkbox-basic", title: "Basic" },
      { id: "checkbox-description", title: "With Description" },
      { id: "checkbox-label", title: "Label Positions" },
      { id: "checkbox-info", title: "With Information Icon" },
    ],
  },
  {
    id: "dropdown",
    title: "Dropdown",
    subsections: [
      { id: "dropdown-button", title: "Button Trigger" },
      { id: "dropdown-avatar", title: "Avatar Trigger" },
      { id: "dropdown-sizes", title: "Different Sizes" },
    ],
  },
  {
    id: "input",
    title: "Input",
    subsections: [
      { id: "input-states", title: "States" },
      { id: "input-types", title: "Types" },
      { id: "input-widths", title: "Widths" },
      { id: "input-values", title: "With Values" },
    ],
  },
  {
    id: "textfield",
    title: "TextField",
    subsections: [
      { id: "textfield-basic", title: "Basic" },
      { id: "textfield-hints", title: "With Hints & Errors" },
      { id: "textfield-addons", title: "With Add-ons" },
      { id: "textfield-labels", title: "Label Variations" },
      { id: "textfield-states", title: "States" },
    ],
  },
  {
    id: "select",
    title: "Select",
    subsections: [
      { id: "select-basic", title: "Basic" },
      { id: "select-groups", title: "Option Groups" },
    ],
  },
  {
    id: "tooltip",
    title: "Tooltip",
    subsections: [
      { id: "tooltip-basic", title: "Basic" },
      { id: "tooltip-positions", title: "Positions" },
      { id: "tooltip-triggers", title: "Triggers" },
      { id: "tooltip-content", title: "Content" },
    ],
  },
];

const STORAGE_KEY = "ui-playground-toc-state";

export default function TableOfContents() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Load expanded sections state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setExpandedSections(parsed);
      } catch (e) {
        console.error("Failed to parse saved TOC state");
      }
    } else {
      // Default to all sections expanded
      const defaultState = sections.reduce((acc, section) => {
        acc[section.id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setExpandedSections(defaultState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
    }
  }, []);

  // Save expanded sections state to localStorage
  useEffect(() => {
    if (Object.keys(expandedSections).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections));
    }
  }, [expandedSections]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0% -35% 0%",
        threshold: 0,
      }
    );

    document.querySelectorAll("section[id]").forEach((section) => {
      observer.observe(section);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  // Auto-expand sections with matching search results
  useEffect(() => {
    if (searchQuery) {
      const matchingSections = sections.reduce((acc, section) => {
        const sectionMatches = section.title.toLowerCase().includes(searchQuery.toLowerCase());
        const subsectionMatches = section.subsections?.some((subsection) =>
          subsection.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (sectionMatches || subsectionMatches) {
          acc[section.id] = true;
        }
        return acc;
      }, {} as Record<string, boolean>);

      setExpandedSections((prev) => ({
        ...prev,
        ...matchingSections,
      }));
    }
  }, [searchQuery]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const filteredSections = sections.map((section) => ({
    ...section,
    subsections: section.subsections?.filter((subsection) =>
      subsection.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    matches: section.title.toLowerCase().includes(searchQuery.toLowerCase()),
  }));

  return (
    <nav className="space-y-4 p-2 text-sm">
      <div className="bg-default/80 sticky top-0 pb-2 backdrop-blur-sm">
        <div className="mb-4 flex justify-center">
          <img
            src="https://media1.tenor.com/m/QWdPngpHxZ8AAAAd/family-guy-css.gif"
            alt="Family Guy CSS GIF"
            width={300}
            height={169}
          />
        </div>
        <Input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {filteredSections.map((section) => {
        // Only show section if it matches or has matching subsections
        if (!searchQuery || section.matches || section?.subsections?.length > 0) {
          return (
            <div key={section.id} className="space-y-2">
              <div className="flex items-center gap-1">
                <Button
                  color="minimal"
                  className={`w-full justify-start px-2 ${
                    activeSection === section.id ? "text-emphasis font-medium" : "text-default"
                  } ${searchQuery && section.matches ? "bg-subtle" : ""}`}
                  onClick={() => scrollToSection(section.id)}>
                  {section.title}
                </Button>
                <Button
                  color="minimal"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => toggleSection(section.id)}>
                  <span className="text-default inline-block transition-transform">
                    {expandedSections[section.id] ? "−" : "+"}
                  </span>
                </Button>
              </div>
              {section.subsections && expandedSections[section.id] && (
                <div className="space-y-1 pl-7">
                  {section.subsections.map((subsection) => (
                    <Button
                      key={subsection.id}
                      color="minimal"
                      className={`w-full justify-start px-2 ${
                        activeSection === subsection.id ? "text-emphasis font-medium" : "text-default"
                      } ${
                        searchQuery && subsection.title.toLowerCase().includes(searchQuery.toLowerCase())
                          ? "bg-subtle"
                          : ""
                      }`}
                      onClick={() => scrollToSection(subsection.id)}>
                      {subsection.title}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        }
        return null;
      })}
    </nav>
  );
}
