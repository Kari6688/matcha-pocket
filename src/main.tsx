import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './auth';
import { isSupabaseConfigured } from './supabase';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <AuthProvider>
        <App />
      </AuthProvider>
    ) : (
      <div className="setup-missing">
        <h1>Matcha Map</h1>
        <p>
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable
          Google sign-in. Create a free project at{' '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
            supabase.com
          </a>
          , enable Google under Authentication → Providers, then set the keys in{' '}
          <code>.env.local</code> and on Vercel.
        </p>
      </div>
    )}
  </StrictMode>,
);
