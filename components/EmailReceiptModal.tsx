
import React, { useState, useEffect } from 'react';
import { Sale } from '../types';
import Icon from './Icon';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { createPlainTextReceipt } from '../utils/receipts';

interface EmailReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

const EmailReceiptModal = ({ isOpen, onClose, sale }: EmailReceiptModalProps) => {
  const [email, setEmail] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!sale) return;

    const generateEmailBody = async () => {
      setIsLoading(true);
      setError('');
      setEmailBody('');

      const plainTextReceipt = createPlainTextReceipt(sale);

      if (!isOnline) {
        setError('AI email generation requires an internet connection. A plain-text receipt is shown below.');
        setEmailBody(plainTextReceipt);
        setIsLoading(false);
        return;
      }
      
      try {
        const prompt = `You are a helpful assistant for a coffee shop called "Cafe Roma". A customer has requested an email receipt. Generate a friendly, professional, plain-text email body that includes the provided receipt. Do not use any markdown, HTML, or other special formatting. Start with a friendly greeting. End with a professional closing. Here is the receipt content to include:\n\n---\n${plainTextReceipt}---`;
        
        const url = `/api-proxy/v1beta/models/gemini-2.5-flash:generateContent`;
        const requestBody = {
          contents: [{ parts: [{ text: prompt }] }],
        };

        const apiResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.json();
            throw new Error(errorBody.error?.message || `API request failed with status ${apiResponse.status}`);
        }

        const responseData = await apiResponse.json();
        const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          throw new Error("The AI returned an empty response.");
        }

        setEmailBody(text);
      } catch (err) {
        console.error("Error generating email body:", err);
        setError('Failed to generate email content. You can still copy the plain text receipt below.');
        // Fallback to plain text receipt if API fails
        setEmailBody(plainTextReceipt);
      } finally {
        setIsLoading(false);
      }
    };

    generateEmailBody();
  }, [sale, isOnline]);
  
  const handleClose = () => {
    // Reset state on close
    setEmail('');
    setEmailBody('');
    setError('');
    onClose();
  }

  if (!isOpen || !sale) return null;

  const mailtoHref = `mailto:${email}?subject=${encodeURIComponent('Your receipt from Cafe Roma')}&body=${encodeURIComponent(emailBody)}`;
  const canSend = email && emailBody && !isLoading;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={handleClose}>
      <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-lg text-text-primary flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-accent">Email Receipt</h2>
          <button onClick={handleClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        {error && <p className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</p>}

        <div className="space-y-4">
            <div>
                <label htmlFor="customer-email" className="block text-sm font-medium text-text-secondary mb-1">Customer's Email</label>
                <input 
                    type="email" 
                    id="customer-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                />
            </div>
             <div className="text-xs text-text-secondary bg-bg-main p-2 rounded-md border border-border-color/50">
              <p>
                <strong>Note:</strong> This will open in your default email app. Please ensure you select
                <strong className="text-accent"> stalbanscaferoma@gmail.com </strong> 
                as the sender.
              </p>
            </div>
            <div>
                 <label htmlFor="email-preview" className="block text-sm font-medium text-text-secondary mb-1">Email Preview</label>
                 <div className="relative">
                    <textarea 
                        id="email-preview"
                        readOnly
                        value={emailBody}
                        className="w-full h-64 p-3 bg-bg-main border border-border-color rounded-md font-mono text-xs whitespace-pre-wrap"
                    />
                    {isLoading && (
                        <div className="absolute inset-0 bg-bg-panel/80 flex flex-col justify-center items-center rounded-md">
                           <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                           <p className="mt-3 text-text-secondary">Generating email with AI...</p>
                        </div>
                    )}
                 </div>
            </div>
        </div>

        <div className="flex justify-end pt-6 mt-auto">
          <button type="button" onClick={handleClose} className="bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md mr-2 hover:bg-opacity-90">Cancel</button>
          <a
            href={canSend ? mailtoHref : undefined}
            onClick={(e) => {
              if (!canSend) e.preventDefault();
              else {
                // We close the modal after a short delay to allow the mail client to open
                setTimeout(handleClose, 500);
              }
            }}
            aria-disabled={!canSend}
            className={`flex items-center gap-2 bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover ${!canSend ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Icon name="email" className="w-5 h-5"/>
            Send via Email Client
          </a>
        </div>
      </div>
    </div>
  );
};

export default EmailReceiptModal;
