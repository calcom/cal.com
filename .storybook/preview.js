//global styles
import "../styles/globals.css";
import "../styles/global.scss"; 

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  layout: 'centered',
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  backgrounds: {
    default: 'light',
    values: [
      {
        name: 'light',
        value: '#ffffff',
      },
      {
        name: 'dark',
        value: '#111111',
      },
    ],
  },
}

export const decorators = [
  (StoryFn) => {    
    return (
      <>      
        <StoryFn />
      </>
    );
  },
];

