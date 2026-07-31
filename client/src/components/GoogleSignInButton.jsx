import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const WIDGET_TIMEOUT_MS = 2500;

export default function GoogleSignInButton() {
  const buttonRef = useRef(null);
  const { handleGoogleCredential, googleClientId } = useAuth();
  const [widgetRendered, setWidgetRendered] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

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
      setWidgetRendered(true);
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

  // If the Google script never loads (blocked, offline, strict browser
  // privacy settings), fall back to a plain link that starts the
  // server-side OAuth redirect flow — no JS widget dependency at all.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!widgetRendered) setShowFallback(true);
    }, WIDGET_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [widgetRendered]);

  if (!googleClientId) {
    return (
      <p className="text-sm text-red-600">
        Missing VITE_GOOGLE_CLIENT_ID — set it in client/.env to enable Google sign-in.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={buttonRef} />
      {showFallback && !widgetRendered && (
        <a
          href="/api/auth/google/redirect"
          className="text-sm px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50"
        >
          Continue with Google
        </a>
      )}
    </div>
  );
}
