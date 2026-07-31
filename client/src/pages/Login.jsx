import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-10 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-brand-700 mb-1">VOD CRM</h1>
        <p className="text-sm text-gray-500 mb-8">Sign in with your Google account to access your CRM.</p>
        <div className="flex justify-center">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
