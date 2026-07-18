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
  apple: boolean;
  email: boolean;
}

export function WelcomeScreen({ onGuest }: Props) {
  const { configured, signInWithApple } = useAuth();
  const [intent, setIntent] = useState<AuthIntent>(null);
  const [providers, setProviders] = useState<ProviderFlags>({
    google: false,
    apple: false,
    email: true,
  });
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    let cancelled = false;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: String(key) } })
      .then((r) => r.json())
      .then((data: { external?: Record<string, boolean> }) => {
        if (cancelled) return;
        setProviders({
          google: Boolean(data.external?.google),
          apple: Boolean(data.external?.apple),
          email: data.external?.email !== false,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const isUp = intent === 'sign-up';

  const onApple = async () => {
    setAppleError(null);
    setAppleBusy(true);
    try {
      await signInWithApple();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      if (/provider is not enabled|Unsupported provider/i.test(msg)) {
        setAppleError('Apple sign-in isn’t enabled in Supabase yet.');
      } else {
        setAppleError(msg || 'Couldn’t start Apple sign-in.');
      }
      setAppleBusy(false);
    }
  };

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
          <div className="welcome-btn-row">
            <button type="button" className="welcome-btn soft" onClick={() => setIntent('sign-up')}>
              Sign up
            </button>
            <button type="button" className="welcome-btn soft" onClick={() => setIntent('log-in')}>
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

          {!configured && (
            <p className="auth-error">Auth isn’t configured. You can still continue as a guest.</p>
          )}

          {configured && (
            <div className="welcome-sheet-auth">
              {providers.google ? (
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

              {providers.apple ? (
                <button
                  type="button"
                  className="auth-apple-btn"
                  onClick={() => void onApple()}
                  disabled={appleBusy}
                >
                  {appleBusy ? 'Redirecting…' : 'Continue with Apple'}
                </button>
              ) : (
                <button type="button" className="auth-apple-btn" disabled>
                  Continue with Apple
                </button>
              )}
              {appleError && <p className="auth-error">{appleError}</p>}

              {providers.email && (
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
