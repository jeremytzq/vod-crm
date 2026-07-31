import { useSearchParams } from 'react-router-dom';

const ERROR_MESSAGES = {
  denied: 'Google sign-in was cancelled.',
  invalid_state: 'Your sign-in session expired. Please try again.',
  failed: 'Google sign-in failed. Please try again.',
};

export default function Login() {
  const [searchParams] = useSearchParams();
  const authError = searchParams.get('authError');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-brand-700 mb-1">VOD CRM</h1>
        <p className="text-sm text-gray-500 mb-6">
          Sign in with your Google account. Your CRM data lives in a Google Sheet in your own Drive.
        </p>
        {authError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-6">
            {ERROR_MESSAGES[authError] || 'Something went wrong signing in with Google.'}
          </p>
        )}
        <a
          href="/api/auth/google/redirect"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-50"
        >
          <GoogleIcon />
          Sign in with Google
        </a>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.6z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.27-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
