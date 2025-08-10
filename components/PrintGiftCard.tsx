import React, { useEffect } from 'react';
import GiftCardContent from './GiftCardContent';

const PrintGiftCard = ({ cardData, onPrintComplete }: { cardData: any | null, onPrintComplete: () => void }) => {
    useEffect(() => {
        if (cardData) {
            document.body.classList.add('print-mode-receipt');

            const handleAfterPrint = () => {
                document.body.classList.remove('print-mode-receipt');
                onPrintComplete();
                window.removeEventListener('afterprint', handleAfterPrint);
            };
            window.addEventListener('afterprint', handleAfterPrint);

            setTimeout(() => {
                window.print();
            }, 100);

            return () => {
                window.removeEventListener('afterprint', handleAfterPrint);
                document.body.classList.remove('print-mode-receipt');
            };
        }
    }, [cardData, onPrintComplete]);

    if (!cardData) {
        return null;
    }

    // Use a fixed size container for printing to ensure consistency
    return (
        <div className="print-section">
            <div style={{ width: '300px', height: '420px' }}>
                <GiftCardContent cardData={cardData} />
            </div>
        </div>
    );
};

export default PrintGiftCard;
