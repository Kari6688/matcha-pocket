import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { EmailSignInForm, GoogleSignInButton } from './AuthControls';
import { Sheet } from './Sheet';

type AuthIntent = 'sign-up' | 'log-in' | null;

interface Props {
  onGuest: () => void;
}

interface ProviderFlags {
  google: boolean;
  email: boolean;
}

/**
 * Which providers Supabase reports as enabled. Kept as an explicit state machine
 * so a slow or failing lookup reads as "still checking" or "here's what broke"
 * rather than silently rendering every button disabled.
 */
type ProviderState =
  | { state: 'loading' }
  | { state: 'ready'; providers: ProviderFlags }
  | { state: 'error'; message: string; detail: string };

export function WelcomeScreen({ onGuest }: Props) {
  const { configured } = useAuth();
  const [intent, setIntent] = useState<AuthIntent>(null);
  const [providerState, setProviderState] = useState<ProviderState>({ state: 'loading' });

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setProviderState({
        state: 'error',
        message: 'This build has no Supabase keys.',
        detail:
          'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the deployment, then redeploy without the build cache — they are baked in at build time.',
      });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: String(key) } });
        if (!res.ok) {
          throw new Error(
            res.status === 401 || res.status === 403
              ? 'Supabase rejected this anon key.'
              : `Supabase answered ${res.status}.`,
          );
        }
        const data = (await res.json()) as { external?: Record<string, boolean> };
        if (cancelled) return;
        setProviderState({
          state: 'ready',
          providers: {
            google: Boolean(data.external?.google),
            email: data.external?.email !== false,
          },
        });
      } catch (err) {
        if (cancelled) return;
        console.error('Could not read Supabase auth settings', err);
        const offline = err instanceof TypeError;
        setProviderState({
          state: 'error',
          message: offline
            ? 'Couldn’t reach Supabase.'
            : err instanceof Error
              ? err.message
              : 'Couldn’t read sign-in options.',
          detail: offline
            ? `Check that ${url} is the Project URL from Supabase → Project Settings → API. The project name is not part of it.`
            : 'Check the anon key for this project in Supabase → Project Settings → API.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const isUp = intent === 'sign-up';

  return (
    <>
      <div className="welcome-screen">
        <div className="welcome-hero">
          <img
            className="welcome-illo"
            src="/matcha-bowl.png"
            alt=""
            draggable={false}
          />
          <h1 className="welcome-title">matcha pocket</h1>
        </div>

        <div className="welcome-actions">
          <div className="welcome-cta" role="group" aria-label="Account">
            <button
              type="button"
              className="welcome-cta-btn primary"
              onClick={() => setIntent('sign-up')}
            >
              Sign up
            </button>
            <button
              type="button"
              className="welcome-cta-btn secondary"
              onClick={() => setIntent('log-in')}
            >
              Log in
            </button>
          </div>
          <button type="button" className="welcome-guest" onClick={onGuest}>
            Continue as a guest
          </button>
        </div>
      </div>

      <Sheet open={intent != null} onClose={() => setIntent(null)}>
        <div className="auth-prompt welcome-sheet">
          <div className="sheet-title">{isUp ? 'Sign up' : 'Log in'}</div>
          <p className="auth-prompt-body">
            {isUp
              ? 'Create an account to save spots and build your matcha library.'
              : 'Welcome back — pick up your map and collection.'}
          </p>

          {!configured ? (
            <>
              <p className="auth-error">Auth isn’t configured — you can still continue as a guest.</p>
              <p className="auth-hint">
                Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for this deployment, then redeploy
                without the build cache.
              </p>
            </>
          ) : providerState.state === 'loading' ? (
            <p className="auth-hint" aria-live="polite">
              Checking sign-in options…
            </p>
          ) : providerState.state === 'error' ? (
            <div className="welcome-sheet-auth">
              <p className="auth-error">{providerState.message}</p>
              <p className="auth-hint">{providerState.detail}</p>
              <div className="auth-divider">
                <span>or email</span>
              </div>
              <EmailSignInForm label="Email" />
            </div>
          ) : (
            <div className="welcome-sheet-auth">
              {providerState.providers.google ? (
                <GoogleSignInButton label="Continue with Google" />
              ) : (
                <div className="auth-provider-disabled">
                  <button type="button" className="auth-google-btn" disabled>
                    Continue with Google
                  </button>
                  <p className="auth-hint">
                    Google isn’t turned on in Supabase yet (Authentication → Providers → Google).
                    Email works below.
                  </p>
                </div>
              )}

              {providerState.providers.email && (
                <>
                  <div className="auth-divider">
                    <span>or email</span>
                  </div>
                  <EmailSignInForm label="Email" />
                </>
              )}
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
