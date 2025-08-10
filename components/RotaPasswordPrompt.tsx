import React, { useState } from 'react';
import Icon from './Icon';
import { useAuth } from '../hooks/useAuth';

interface RotaPasswordPromptProps {
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

const RotaPasswordPrompt = ({ onSuccess, onCancel, title = "Authorization Required", description = "Please re-enter your password to access this section." }: RotaPasswordPromptProps) => {
  const { reauthenticate } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await reauthenticate(password);
      onSuccess();
    } catch (err: any) {
      let errorMessage = err.message || 'An unknown error occurred.';
      if (errorMessage.includes('Indexed Database') || errorMessage.includes('failed-precondition')) {
          errorMessage = 'A local storage error occurred. This often happens if the app is open in multiple browser tabs. Please close any other tabs and refresh the page.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center p-8 bg-bg-main text-text-primary">
      <div className="w-full max-w-md bg-bg-panel p-8 rounded-lg shadow-lg border border-border-color">
        <div className="text-center">
            <Icon name="lock" className="w-12 h-12 mx-auto text-accent mb-4" />
            <h3 className="text-2xl font-bold text-text-primary mb-2">
                {title}
            </h3>
            <p className="text-text-secondary mb-6">{description}</p>
        </div>
        <form onSubmit={handleSubmit} className="w-full space-y-4">
            {error && <p className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">{error}</p>}
            <div>
                <label htmlFor="rota-password" className="sr-only">Password</label>
                <input 
                    type="password"
                    id="rota-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                    required
                    autoFocus
                />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
                 <button type="button" onClick={onCancel} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md hover:bg-opacity-90">
                    Cancel
                </button>
                <button type="submit" disabled={loading} className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover disabled:bg-gray-400">
                    {loading ? 'Unlocking...' : 'Unlock'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default RotaPasswordPrompt;