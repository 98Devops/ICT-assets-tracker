import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { IatsLogo } from '@/components/branding/IatsLogo';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const onForgot = async () => {
    if (!email) {
      setError('Enter your email above first, then click "Forgot password?".');
      return;
    }
    setResetting(true);
    setError(null);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    // same message regardless of outcome — don't leak which emails exist
    toast.success(`If an account exists for ${email}, a reset link is on its way.`);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signIn(email, password);
    if (err) setError(err);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <IatsLogo size={56} />
          <h1 className="text-2xl font-semibold">ICT Assets Tracker</h1>
          <p className="text-sm text-ink-muted">Sign in to your organization&apos;s register</p>
        </div>
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-status-faulty">
              {error}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            type="button"
            disabled={resetting}
            onClick={() => void onForgot()}
            className="w-full text-center text-xs text-ink-muted hover:text-ember transition"
          >
            {resetting ? 'Sending…' : 'Forgot password?'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-ink-muted">
          Accounts are created by your administrator.
        </p>
      </div>
    </div>
  );
}
