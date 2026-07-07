import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { IatsLogo } from '@/components/branding/IatsLogo';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

/** Landing page for the Supabase recovery link; also usable by a signed-in user to change password. */
export function ResetPasswordPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError('Could not update the password. The reset link may have expired — request a new one.');
      return;
    }
    toast.success('Password updated');
    navigate('/');
  };

  if (!session) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface px-4">
        <div className="card p-8 max-w-sm text-center space-y-3">
          <IatsLogo size={48} className="mx-auto" />
          <p className="text-sm text-ink-muted">
            This page is opened from the password-reset link in your email. If your link has
            expired, request a new one from the sign-in page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <IatsLogo size={56} />
          <h1 className="text-2xl font-semibold">Set a new password</h1>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="card p-6 space-y-4">
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium mb-1">
              New password
            </label>
            <input
              id="new_password"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium mb-1">
              Confirm password
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-status-faulty">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
