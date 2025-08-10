
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, UnclaimedGiftCard } from '../../types';
import { SyncManager } from '../../utils/syncManager';
import Icon from '../Icon';

interface RedeemGiftCardReportProps {
    syncManager: SyncManager;
    customers: Customer[];
    onRequestScan: (callback: (data: string) => void) => void;
}

type ValidationStatus = 'idle' | 'loading' | 'valid' | 'invalid';
type RedemptionStatus = 'idle' | 'redeeming' | 'success' | 'error';

const RedeemGiftCardReport = ({ syncManager, customers, onRequestScan }: RedeemGiftCardReportProps) => {
    const [cardIdInput, setCardIdInput] = useState('');
    const [validatedCard, setValidatedCard] = useState<UnclaimedGiftCard | null>(null);
    const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
    const [validationError, setValidationError] = useState('');
    
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [redemptionStatus, setRedemptionStatus] = useState<RedemptionStatus>('idle');
    const [redemptionMessage, setRedemptionMessage] = useState('');
    
    const resetForm = useCallback(() => {
        setCardIdInput('');
        setValidatedCard(null);
        setValidationStatus('idle');
        setValidationError('');
        setCustomerSearch('');
        setSelectedCustomer(null);
        setRedemptionStatus('idle');
        setRedemptionMessage('');
    }, []);

    const handleFindCard = useCallback(async (id: string) => {
        const trimmedId = id.trim();
        if (!trimmedId) return;

        setValidationStatus('loading');
        setValidationError('');
        setValidatedCard(null);
        setSelectedCustomer(null);
        setCustomerSearch('');

        // The data from syncManager is a merged view of local and remote.
        const allUnclaimedCards = syncManager.getUnclaimedGiftCards();
        const card = allUnclaimedCards.find(c => c.id === trimmedId);

        if (!card) {
            setValidationStatus('invalid');
            setValidationError('Gift card ID not found.');
        } else if (card.isRedeemed) {
            setValidationStatus('invalid');
            setValidationError(`This card was already redeemed on ${new Date(card.redeemedAt || 0).toLocaleDateString()}.`);
        } else {
            setValidatedCard(card);
            setValidationStatus('valid');
        }
    }, [syncManager]);

    const handleScanSuccess = useCallback((data: string) => {
        try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'unclaimed-gift-card' && parsed.id) {
                setCardIdInput(parsed.id);
                handleFindCard(parsed.id);
            } else {
                 setValidationError('Scanned QR code is not a valid gift card.');
                 setValidationStatus('invalid');
            }
        } catch (e) {
            setValidationError('Scanned QR code is not a valid gift card.');
            setValidationStatus('invalid');
        }
    }, [handleFindCard]);

    const handleRedeem = () => {
        if (!validatedCard || !selectedCustomer) return;

        setRedemptionStatus('redeeming');
        setRedemptionMessage('');

        const updatedCustomer: Customer = {
            ...selectedCustomer,
            giftCardBalance: (selectedCustomer.giftCardBalance || 0) + validatedCard.amount,
            pointsHistory: [
                ...(selectedCustomer.pointsHistory || []),
                {
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    change: validatedCard.amount,
                    reason: `Redeemed Gift Card (+£${validatedCard.amount.toFixed(2)})`,
                    saleId: validatedCard.creatingSaleId,
                }
            ]
        };

        const updatedCard: UnclaimedGiftCard = {
            ...validatedCard,
            isRedeemed: true,
            redeemedAt: new Date().toISOString(),
            redeemedByCustomerId: selectedCustomer.id,
        };

        syncManager.saveItem('customers', updatedCustomer);
        syncManager.saveItem('unclaimedGiftCards', updatedCard);

        setRedemptionStatus('success');
        setRedemptionMessage(`Successfully applied £${validatedCard.amount.toFixed(2)} to ${selectedCustomer.name}'s account.`);
        
        // Reset after a delay
        setTimeout(() => resetForm(), 4000);
    };

    const filteredCustomers = useMemo(() => {
        if (!customerSearch) return [];
        const trimmedSearch = customerSearch.trim();
        const lowercasedTerm = trimmedSearch.toLowerCase();
        return customers
            .filter(c => 
                c.name.toLowerCase().includes(lowercasedTerm) || 
                (c.phone || '').includes(trimmedSearch)
            )
            .slice(0, 5);
    }, [customerSearch, customers]);

    return (
        <div className="p-6 bg-bg-main min-h-full text-text-primary">
            <h2 className="text-3xl font-bold">Redeem Gift Card</h2>
            <p className="text-text-secondary mt-1 mb-6">Manually look up a gift card by its ID and apply the balance to a customer's account.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                {/* Step 1: Find Card */}
                <div className="bg-bg-panel p-6 rounded-lg shadow space-y-4">
                    <h3 className="text-xl font-bold text-accent border-b border-border-color pb-2">1. Find Gift Card</h3>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={cardIdInput}
                            onChange={e => setCardIdInput(e.target.value)}
                            placeholder="Enter or scan card ID"
                            className="flex-grow p-2 border border-border-color rounded-lg bg-bg-main focus:ring-accent focus:border-accent"
                        />
                        <button onClick={() => onRequestScan(handleScanSuccess)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Icon name="link" className="w-5 h-5"/></button>
                    </div>
                    <button onClick={() => handleFindCard(cardIdInput)} disabled={!cardIdInput || validationStatus === 'loading'} className="w-full bg-accent text-text-on-accent font-semibold py-2 rounded-lg hover:bg-accent-hover disabled:bg-gray-500">
                        {validationStatus === 'loading' ? 'Searching...' : 'Find Card'}
                    </button>
                    
                    {validationStatus === 'invalid' && <p className="text-red-400 text-sm">{validationError}</p>}
                    {validationStatus === 'valid' && validatedCard && (
                        <div className="bg-green-900/50 p-4 rounded-lg text-center">
                            <p className="text-sm text-green-300">Card Found</p>
                            <p className="text-4xl font-bold text-white">£{validatedCard.amount.toFixed(2)}</p>
                            <p className="text-xs text-green-400">Created on {new Date(validatedCard.createdAt).toLocaleDateString()}</p>
                        </div>
                    )}
                </div>

                {/* Step 2: Assign to Customer */}
                <div className={`bg-bg-panel p-6 rounded-lg shadow space-y-4 transition-opacity ${validatedCard ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <h3 className="text-xl font-bold text-accent border-b border-border-color pb-2">2. Assign to Customer</h3>
                    <input
                        type="text"
                        value={customerSearch}
                        onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }}
                        placeholder="Search for customer by name or phone..."
                        className="w-full p-2 border border-border-color rounded-lg bg-bg-main"
                    />
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {filteredCustomers.map(c => (
                            <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); }} className="w-full text-left p-2 rounded-md bg-bg-main hover:bg-accent hover:text-text-on-accent">
                                {c.name}
                            </button>
                        ))}
                    </div>
                    {selectedCustomer && (
                         <div className="bg-blue-900/50 p-4 rounded-lg text-center">
                            <p className="text-sm text-blue-300">Selected Customer</p>
                            <p className="text-2xl font-bold text-white">{selectedCustomer.name}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Step 3: Redeem */}
            <div className="max-w-4xl mt-6">
                <button onClick={handleRedeem} disabled={!validatedCard || !selectedCustomer || redemptionStatus !== 'idle'} className="w-full bg-green-600 text-white font-bold py-4 rounded-lg text-xl hover:bg-green-700 disabled:bg-gray-500">
                    Redeem Balance
                </button>
                {redemptionStatus === 'success' && <p className="text-green-400 mt-2 text-center">{redemptionMessage}</p>}
                {redemptionStatus === 'error' && <p className="text-red-400 mt-2 text-center">{redemptionMessage}</p>}
            </div>
        </div>
    );
};

export default RedeemGiftCardReport;
