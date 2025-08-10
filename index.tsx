
import React from 'react';
import ReactDOM from 'react-dom/client';
import SingleFileApp from './components/SingleFileApp';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SingleFileApp />
  </React.StrictMode>
);