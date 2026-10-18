import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DataProvider } from './components/DataContext';
import { PublicEmployeeProfile } from './components/PublicEmployeeProfile';
import { PublicServiceForm } from './components/PublicServiceForm';
import { getPublicProfileId } from './utils/publicRouting';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Check if this request is for a public screen (QR code scan or public form)
// Public routes render immediately WITHOUT initializing full DataProvider or prompting for login!
const publicProfileId = getPublicProfileId();
const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const isServiceForm = searchParams.get('form') === 'service';

if (publicProfileId) {
  root.render(
    <React.StrictMode>
      <PublicEmployeeProfile publicProfileId={publicProfileId} />
    </React.StrictMode>
  );
} else if (isServiceForm) {
  root.render(
    <React.StrictMode>
      <PublicServiceForm />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <DataProvider>
        <App />
      </DataProvider>
    </React.StrictMode>
  );
}
