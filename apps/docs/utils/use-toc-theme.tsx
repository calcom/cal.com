import { createContext, useContext } from "react";

export const TOCThemeContext = createContext<{theme: any, isAllExpanded: boolean} | undefined>(undefined);

export const TOCThemeProvider = ({
  theme,
  isAllExpanded,
  children,
}: {
  theme: any;
  isAllExpanded: boolean;
  children: any;
}) => {
  return (
    <TOCThemeContext.Provider value={{ theme, isAllExpanded }}>
      {children}
    </TOCThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(TOCThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
