import React, { useState, useEffect } from 'react';
import { Customer, PointTransaction } from '../types';
import Icon from './Icon';

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id' | 'totalLoyaltyPoints' | 'giftCardBalance' | 'pointsHistory'> & { id?: string }) => void;
    customerToEdit: Customer | null;
}

const CustomerModal = ({ isOpen, onClose, onSave, customerToEdit }: CustomerModalProps) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [gdprConsent, setGdprConsent] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (customerToEdit) {
            setName(customerToEdit.name);
            setEmail(customerToEdit.email || '');
            setPhone(customerToEdit.phone || '');
            setGdprConsent(true); // Existing customers have already consented
        } else {
            setName('');
            setEmail('');
            setPhone('');
            setGdprConsent(false); // New customers must consent
        }
        setError('');
    }, [customerToEdit, isOpen]);

    if (!isOpen) return null;

    const showPrivacyInfo = (e: React.MouseEvent) => {
        e.preventDefault();
        alert(
            "Privacy Information (GDPR)\n\n" +
            "By signing up, you agree that Cafe Roma can store your personal information (name, email, phone number) for the following purposes:\n\n" +
            "- To manage your loyalty points and gift card balance.\n" +
            "- To contact you with receipts or information directly related to your purchases.\n\n" +
            "We will never share your data with third parties for marketing purposes. You have the right to request access to, or deletion of, your personal data at any time by speaking to a member of staff."
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Customer name is required.');
            return;
        }
        if (!customerToEdit && !gdprConsent) {
            setError('Please consent to the privacy policy to sign up.');
            return;
        }

        onSave({
            id: customerToEdit?.id,
            name: name.trim(),
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
        });
    };

    const inputStyle = "mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent";
    const btnPrimary = "bg-accent text-text-on-accent font-bold py-2 px-4 rounded-md hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed";
    const btnSecondary = "bg-text-secondary text-bg-main font-bold py-2 px-4 rounded-md mr-2 hover:bg-opacity-90";
    const isSaveDisabled = !name.trim() || (!customerToEdit && !gdprConsent);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-lg text-text-primary" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-accent">{customerToEdit ? 'Edit Customer' : 'Add New Customer'}</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><Icon name="close" className="w-6 h-6" /></button>
                </div>
                {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-md mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="cust-name" className="block text-sm font-medium text-text-secondary">Full Name</label>
                        <input type="text" id="cust-name" value={name} onChange={e => setName(e.target.value)} className={inputStyle} required />
                    </div>
                    <div>
                        <label htmlFor="cust-email" className="block text-sm font-medium text-text-secondary">Email Address</label>
                        <input type="email" id="cust-email" value={email} onChange={e => setEmail(e.target.value)} className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="cust-phone" className="block text-sm font-medium text-text-secondary">Phone Number</label>
                        <input type="tel" id="cust-phone" value={phone} onChange={e => setPhone(e.target.value)} className={inputStyle} />
                    </div>

                    {!customerToEdit && (
                        <div className="pt-2">
                            <label className="flex items-start gap-3 text-sm font-medium text-text-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={gdprConsent}
                                    onChange={(e) => setGdprConsent(e.target.checked)}
                                    className="w-4 h-4 mt-0.5 rounded bg-bg-main border-border-color text-accent focus:ring-accent flex-shrink-0"
                                />
                                <div>
                                    I consent to Cafe Roma storing my details for the loyalty scheme and for sending receipts. I understand I can request my data to be removed at any time.
                                    <a href="#" onClick={showPrivacyInfo} className="ml-1 text-accent hover:underline">
                                        Learn more.
                                    </a>
                                </div>
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-2">
                        <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
                        <button type="submit" className={btnPrimary} disabled={isSaveDisabled}>Save Customer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerModal;