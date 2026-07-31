import { useSearchParams } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';

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
        <p className="text-sm text-gray-500 mb-6">Sign in with your Google account to access your CRM.</p>
        {authError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-6">
            {ERROR_MESSAGES[authError] || 'Something went wrong signing in with Google.'}
          </p>
        )}
        <div className="flex justify-center">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
