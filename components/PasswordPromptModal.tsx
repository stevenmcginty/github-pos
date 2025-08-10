import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { useAuth } from '../hooks/useAuth';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  description: string;
}

const PasswordPromptModal = ({ isOpen, onClose, onSuccess, title, description }: PasswordPromptModalProps) => {
  const { reauthenticate } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!isOpen) {
        // Reset state when modal closes
        setPassword('');
        setError(null);
        setLoading(false);
    }
  }, [isOpen])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await reauthenticate(password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-bg-panel p-8 rounded-lg shadow-lg w-full max-w-md text-text-primary" onClick={e => e.stopPropagation()}>
        <div className="text-center">
            <Icon name="lock" className="w-12 h-12 mx-auto text-accent mb-4" />
            <h3 className="text-2xl font-bold text-text-primary mb-2">{title}</h3>
            <p className="text-text-secondary mb-6">{description}</p>
        </div>
        <form onSubmit={handleSubmit} className="w-full space-y-4">
            {error && <p className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">{error}</p>}
            <div>
                <label htmlFor="prompt-password" className="sr-only">Password</label>
                <input
                    type="password"
                    id="prompt-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                    required
                    autoFocus
                />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
                 <button type="button" onClick={onClose} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md hover:bg-opacity-90">
                    Cancel
                </button>
                <button type="submit" disabled={loading} className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover disabled:bg-gray-400">
                    {loading ? 'Verifying...' : 'Authorize'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordPromptModal;
