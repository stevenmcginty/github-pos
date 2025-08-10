import React, { useState, useEffect } from 'react';
import Icon from './Icon';

const InstallPWAButton = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      // Hide the prompt after installation
      setInstallPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    // Show the install prompt
    installPrompt.prompt();
    // Wait for the user to respond to the prompt
    await installPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setInstallPrompt(null);
  };

  if (!installPrompt) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className="w-full bg-brand-secondary text-brand-dark font-bold py-3 rounded-lg hover:bg-brand-accent transition-colors flex items-center justify-center gap-2"
      aria-label="Install App for Offline Use"
    >
      <Icon name="download" className="w-5 h-5" />
      Install App for Offline Use
    </button>
  );
};

export default InstallPWAButton;