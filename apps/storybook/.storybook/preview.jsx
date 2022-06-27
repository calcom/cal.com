import "../styles/globals.css";

export const decorators = [
  (Story) => (
    <div className="subpixel-antialiased">
      <Story />
    </div>
  ),
];
