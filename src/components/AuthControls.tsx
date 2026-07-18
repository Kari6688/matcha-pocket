import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';

function GoogleMark() {
  return (
    <svg className="google-mark" width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

function authErrorMessage(err: unknown, configured: boolean) {
  const message = err instanceof Error ? err.message : String(err);
  if (/provider is not enabled|Unsupported provider/i.test(message)) {
    return 'Google isn’t enabled in Supabase yet. Use email below, or enable Google under Authentication → Providers.';
  }
  if (!configured) return 'Auth isn’t configured yet.';
  return message || 'Something went wrong. Try again.';
}

export function GoogleSignInButton({
  label = 'Sign up / Log in with Google',
  className = 'auth-google-btn',
  onStarted,
}: {
  label?: string;
  className?: string;
  onStarted?: () => void;
}) {
  const { signInWithGoogle, configured } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setError(null);
    setBusy(true);
    onStarted?.();
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setError(authErrorMessage(err, configured));
      setBusy(false);
    }
  };

  return (
    <div className="auth-google-wrap">
      <button type="button" className={className} onClick={onClick} disabled={busy || !configured}>
        <GoogleMark />
        {busy ? 'Redirecting…' : label}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}

export function EmailSignInForm({
  onStarted,
  label = 'Or use your email',
}: {
  onStarted?: () => void;
  label?: string;
}) {
  const { signInWithEmail, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmail(email);
      setSent(true);
      onStarted?.();
    } catch (err) {
      console.error(err);
      setError(authErrorMessage(err, configured));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <p className="auth-sent">
        Check your email for a login link. Open it on this device to finish signing in.
      </p>
    );
  }

  return (
    <form className="auth-email-form" onSubmit={onSubmit}>
      <label className="auth-email-label" htmlFor="auth-email">
        {label}
      </label>
      <input
        id="auth-email"
        className="input auth-email-input"
        type="email"
        autoComplete="email"
        placeholder="you@gmail.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={busy || !configured}
      />
      <button type="submit" className="auth-email-btn" disabled={busy || !configured}>
        {busy ? 'Sending…' : 'Email me a login link'}
      </button>
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}

/** Compact Google-first sign-in control for the map sidebar / header. */
export function AuthControls() {
  const { isSignedIn, signOut, email } = useAuth();

  if (isSignedIn) {
    return (
      <div className="auth-controls">
        <button
          type="button"
          className="auth-signin-btn"
          onClick={() => void signOut()}
          title={email ?? 'Signed in'}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="auth-controls">
      <GoogleSignInButton label="Google" className="auth-signin-btn" />
    </div>
  );
}

/** Full-page / tab gate when auth is required. */
export function AuthWall({ title, body }: { title: string; body: string }) {
  const { configured } = useAuth();

  return (
    <div className="auth-wall">
      <h2 className="auth-wall-title">{title}</h2>
      <p className="auth-wall-body">{body}</p>
      {configured ? (
        <>
          <GoogleSignInButton />
          <EmailSignInForm />
          <p className="auth-wall-hint">
            Email magic link works now. Google needs to be enabled in Supabase → Authentication →
            Providers.
          </p>
        </>
      ) : (
        <p className="auth-wall-body">
          Add Supabase keys to enable sign-in (see <code>.env.example</code>).
        </p>
      )}
    </div>
  );
}
