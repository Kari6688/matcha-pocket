import { AuthControls, AuthWall } from './AuthControls';
import { useAuth } from '../auth';

interface Props {
  spotCount: number;
  tinCount: number;
  isGuest?: boolean;
  onRequestSignUp?: () => void;
  syncNote?: string | null;
}

export function ProfilePage({
  spotCount,
  tinCount,
  isGuest,
  onRequestSignUp,
  syncNote,
}: Props) {
  const { isSignedIn, email, signOut } = useAuth();

  return (
    <div className="profile-page">
      <header className="collection-head">
        <h1 className="collection-title">Profile</h1>
        {isSignedIn && <AuthControls />}
      </header>

      {isGuest && !isSignedIn ? (
        <div className="profile-guest">
          <p className="profile-guest-label">Browsing as guest</p>
          <p className="profile-note">
            Explore the map freely. Sign up to unlock your matcha library and save spots. Social
            features will live here later.
          </p>
          <button type="button" className="auth-google-btn" onClick={onRequestSignUp}>
            Sign up
          </button>
          <button
            type="button"
            className="welcome-guest profile-leave-guest"
            onClick={() => void signOut()}
          >
            Back to welcome
          </button>
        </div>
      ) : !isSignedIn ? (
        <AuthWall
          title="Sign up or log in"
          body="Use Google or email to save spots and your tin collection."
        />
      ) : (
        <>
          <div className="profile-card">
            <div className="profile-row">
              <span>Signed in as</span>
              <strong className="profile-email">{email ?? 'You'}</strong>
            </div>
            <div className="profile-row">
              <span>Saved spots</span>
              <strong>{spotCount}</strong>
            </div>
            <div className="profile-row">
              <span>Tins in collection</span>
              <strong>{tinCount}</strong>
            </div>
          </div>
          <p className="profile-note">
            Your spots and tins sync to your account across devices when you’re online.
          </p>
          {syncNote && <p className="profile-sync-note">{syncNote}</p>}
        </>
      )}
    </div>
  );
}
