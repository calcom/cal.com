import React from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  return (
    <div style={{ width: '400px', height: '600px', padding: '20px' }}>
      <h1>Cal.com Companion</h1>
      <p>This is a placeholder for the Expo web build integration.</p>
      <p>
        The Expo web build will be embedded here once the build process is
        configured.
      </p>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<Popup />);
}

export default Popup;
