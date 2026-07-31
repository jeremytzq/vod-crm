import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function GoogleSignInButton() {
  const buttonRef = useRef(null);
  const { handleGoogleCredential, googleClientId } = useAuth();

  useEffect(() => {
    if (!googleClientId) return;

    function render() {
      if (!window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          handleGoogleCredential(response).catch((err) => {
            console.error('Google sign-in failed', err);
          });
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
      });
    }

    if (window.google?.accounts?.id) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [googleClientId, handleGoogleCredential]);

  if (!googleClientId) {
    return (
      <p className="text-sm text-red-600">
        Missing VITE_GOOGLE_CLIENT_ID — set it in client/.env to enable Google sign-in.
      </p>
    );
  }

  return <div ref={buttonRef} />;
}
