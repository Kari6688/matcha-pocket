import { AuthControls, AuthWall } from './AuthControls';
import { useAuth } from '../auth';

interface Props {
  spotCount: number;
  tinCount: number;
}

export function ProfilePage({ spotCount, tinCount }: Props) {
  const { isSignedIn, email } = useAuth();

  return (
    <div className="profile-page">
      <header className="collection-head">
        <h1 className="collection-title">Profile</h1>
        <AuthControls />
      </header>

      {!isSignedIn ? (
        <AuthWall
          title="Sign up or log in with Google"
          body="Use your Google account to save spots and your tin collection — private to you. First visit creates your account; next time you’re logged right in."
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
            Your spots and tins are stored on this device under your Google account. Signing out
            hides them until you sign back in.
          </p>
        </>
      )}
    </div>
  );
}
