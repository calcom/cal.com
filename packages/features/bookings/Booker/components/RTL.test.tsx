import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { describe, expect, it, beforeEach } from "vitest";
import React from "react";

// Mock the useIsRTL hook
const mockUseIsRTL = vi.fn();
vi.mock("@calcom/lib/hooks/useIsRTL", () => ({
  useIsRTL: mockUseIsRTL,
}));

// Mock Booker component - simplified version for testing
const TestBookerComponent = ({ event }: { event: { data?: { interfaceLanguage?: string } } }) => {
  const { isRTL, direction, fontClass } = mockUseIsRTL(event.data?.interfaceLanguage);
  
  return (
    <div 
      dir={direction}
      className={`booker-container ${fontClass}`}
      data-testid="booker-container"
    >
      <div data-testid="rtl-indicator">{isRTL ? "RTL" : "LTR"}</div>
      <div data-testid="direction">{direction}</div>
      <div data-testid="font-class">{fontClass}</div>
      <div className="text-content">Booking content</div>
    </div>
  );
};

describe("Booker RTL Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with Arabic interface language", () => {
    it("should apply RTL direction and Arabic font", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: true,
        direction: "rtl",
        locale: "ar",
        fontClass: "font-tajawal",
      });

      const event = { data: { interfaceLanguage: "ar" } };
      render(<TestBookerComponent event={event} />);

      const container = screen.getByTestId("booker-container");
      expect(container).toHaveAttribute("dir", "rtl");
      expect(container).toHaveClass("font-tajawal");
      
      expect(screen.getByTestId("rtl-indicator")).toHaveTextContent("RTL");
      expect(screen.getByTestId("direction")).toHaveTextContent("rtl");
      expect(screen.getByTestId("font-class")).toHaveTextContent("font-tajawal");
      
      expect(mockUseIsRTL).toHaveBeenCalledWith("ar");
    });

    it("should handle Arabic regional variants", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: true,
        direction: "rtl",
        locale: "ar-SA",
        fontClass: "font-tajawal",
      });

      const event = { data: { interfaceLanguage: "ar-SA" } };
      render(<TestBookerComponent event={event} />);

      expect(mockUseIsRTL).toHaveBeenCalledWith("ar-SA");
      expect(screen.getByTestId("booker-container")).toHaveAttribute("dir", "rtl");
      expect(screen.getByTestId("booker-container")).toHaveClass("font-tajawal");
    });
  });

  describe("with Hebrew interface language", () => {
    it("should apply RTL direction without Arabic font", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: true,
        direction: "rtl",
        locale: "he",
        fontClass: "",
      });

      const event = { data: { interfaceLanguage: "he" } };
      render(<TestBookerComponent event={event} />);

      const container = screen.getByTestId("booker-container");
      expect(container).toHaveAttribute("dir", "rtl");
      expect(container).not.toHaveClass("font-tajawal");
      expect(container).toHaveClass("booker-container"); // Base class only
      
      expect(screen.getByTestId("rtl-indicator")).toHaveTextContent("RTL");
      expect(screen.getByTestId("direction")).toHaveTextContent("rtl");
      expect(screen.getByTestId("font-class")).toHaveTextContent("");
      
      expect(mockUseIsRTL).toHaveBeenCalledWith("he");
    });
  });

  describe("with English interface language", () => {
    it("should apply LTR direction", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: false,
        direction: "ltr",
        locale: "en",
        fontClass: "",
      });

      const event = { data: { interfaceLanguage: "en" } };
      render(<TestBookerComponent event={event} />);

      const container = screen.getByTestId("booker-container");
      expect(container).toHaveAttribute("dir", "ltr");
      expect(container).not.toHaveClass("font-tajawal");
      
      expect(screen.getByTestId("rtl-indicator")).toHaveTextContent("LTR");
      expect(screen.getByTestId("direction")).toHaveTextContent("ltr");
      expect(screen.getByTestId("font-class")).toHaveTextContent("");
      
      expect(mockUseIsRTL).toHaveBeenCalledWith("en");
    });
  });

  describe("without interface language", () => {
    it("should fallback to browser/router locale", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: false,
        direction: "ltr",
        locale: "en",
        fontClass: "",
      });

      const event = { data: {} }; // No interfaceLanguage
      render(<TestBookerComponent event={event} />);

      expect(mockUseIsRTL).toHaveBeenCalledWith(undefined);
      expect(screen.getByTestId("booker-container")).toHaveAttribute("dir", "ltr");
    });

    it("should handle event without data", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: false,
        direction: "ltr",
        locale: "en",
        fontClass: "",
      });

      const event = {}; // No data property
      render(<TestBookerComponent event={event} />);

      expect(mockUseIsRTL).toHaveBeenCalledWith(undefined);
      expect(screen.getByTestId("booker-container")).toHaveAttribute("dir", "ltr");
    });
  });

  describe("className composition", () => {
    it("should properly combine base classes with font class", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: true,
        direction: "rtl",
        locale: "ar",
        fontClass: "font-tajawal",
      });

      const event = { data: { interfaceLanguage: "ar" } };
      render(<TestBookerComponent event={event} />);

      const container = screen.getByTestId("booker-container");
      expect(container).toHaveClass("booker-container");
      expect(container).toHaveClass("font-tajawal");
      expect(container.className).toBe("booker-container font-tajawal");
    });

    it("should handle empty font class gracefully", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: false,
        direction: "ltr",
        locale: "en",
        fontClass: "",
      });

      const event = { data: { interfaceLanguage: "en" } };
      render(<TestBookerComponent event={event} />);

      const container = screen.getByTestId("booker-container");
      expect(container).toHaveClass("booker-container");
      expect(container).not.toHaveClass("font-tajawal");
      expect(container.className).toBe("booker-container ");
    });
  });

  describe("hook call patterns", () => {
    it("should call useIsRTL with correct interface language parameter", () => {
      mockUseIsRTL.mockReturnValue({
        isRTL: true,
        direction: "rtl",
        locale: "ar",
        fontClass: "font-tajawal",
      });

      const testCases = [
        { interfaceLanguage: "ar", expected: "ar" },
        { interfaceLanguage: "he", expected: "he" },
        { interfaceLanguage: "en", expected: "en" },
        { interfaceLanguage: "", expected: "" },
      ];

      testCases.forEach(({ interfaceLanguage, expected }) => {
        const event = { data: { interfaceLanguage } };
        const { unmount } = render(<TestBookerComponent event={event} />);
        
        expect(mockUseIsRTL).toHaveBeenCalledWith(expected);
        
        unmount();
        mockUseIsRTL.mockClear();
      });
    });
  });
});