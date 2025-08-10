import React, { useState } from 'react';
import { Customer, UnclaimedGiftCard } from '../types';
import Icon from './Icon';
import GiftCardContent from './GiftCardContent';
import PrintGiftCard from './PrintGiftCard';

interface ShareableGiftCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardData: {
        type: 'top-up';
        amount: number;
        customer: Customer;
    } | {
        type: 'physical-card';
        card: UnclaimedGiftCard;
    } | null;
}

const ShareableGiftCardModal = ({ isOpen, onClose, cardData }: ShareableGiftCardModalProps) => {
    const [cardToPrint, setCardToPrint] = useState<any | null>(null);

    const handleShare = async () => {
        if (!cardData) return;

        try {
            const QRCode = (await import('qrcode')).default;

            // 1. Create main canvas for the entire gift card image
            const canvas = document.createElement('canvas');
            const width = 300;
            const height = 420;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");

            // 2. Draw background color and pattern
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            // Use a path for rounded corners for wider compatibility than ctx.roundRect
            ctx.moveTo(24, 0);
            ctx.lineTo(width - 24, 0);
            ctx.arcTo(width, 0, width, 24, 24);
            ctx.lineTo(width, height - 24);
            ctx.arcTo(width, height, width - 24, height, 24);
            ctx.lineTo(24, height);
            ctx.arcTo(0, height, 0, height - 24, 24);
            ctx.lineTo(0, 24);
            ctx.arcTo(0, 0, 24, 0, 24);
            ctx.closePath();
            ctx.fill();

            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = 20;
            patternCanvas.height = 20;
            const pctx = patternCanvas.getContext('2d');
            if (pctx) {
                pctx.fillStyle = '#d4af37';
                pctx.globalAlpha = 0.1;
                pctx.fillRect(5, 0, 2, 8);
                pctx.fillRect(0, 5, 8, 2);
                const pattern = ctx.createPattern(patternCanvas, 'repeat');
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1.0;

            // 3. Draw text elements
            const amount = cardData.type === 'top-up' ? cardData.amount : cardData.card.amount;
            const amountText = `£${amount.toFixed(2)}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#D4AF37';
            ctx.fillText('GIFT CARD', width / 2, 70);
            
            ctx.font = "bold 50px 'Times New Roman', serif";
            ctx.fillStyle = 'white';
            ctx.fillText(amountText, width / 2, 125);

            // 4. Draw QR code or customer name
            if (cardData.type === 'physical-card') {
                const qrCanvas = document.createElement('canvas');
                const qrContent = JSON.stringify({ type: 'unclaimed-gift-card', id: cardData.card.id });
                await QRCode.toCanvas(qrCanvas, qrContent, { width: 124, margin: 0, errorCorrectionLevel: 'H' });
                
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.moveTo((width - 128) / 2 + 8, 176);
                ctx.lineTo((width + 128) / 2 - 8, 176);
                ctx.arcTo((width + 128) / 2, 176, (width + 128) / 2, 176 + 8, 8);
                ctx.lineTo((width + 128) / 2, 176 + 128 - 8);
                ctx.arcTo((width + 128) / 2, 176 + 128, (width + 128) / 2 - 8, 176 + 128, 8);
                ctx.lineTo((width - 128) / 2 + 8, 176 + 128);
                ctx.arcTo((width - 128) / 2, 176 + 128, (width - 128) / 2, 176 + 128 - 8, 8);
                ctx.lineTo((width - 128) / 2, 176 + 8);
                ctx.arcTo((width - 128) / 2, 176, (width - 128) / 2 + 8, 176, 8);
                ctx.closePath();
                ctx.fill();
                
                ctx.drawImage(qrCanvas, (width - 124) / 2, 178);

                ctx.font = '12px sans-serif';
                ctx.fillStyle = '#D4AF37';
                ctx.globalAlpha = 0.8;
                ctx.fillText('PRESENT QR TO REDEEM', width / 2, 350);
                ctx.globalAlpha = 1.0;
            } else if (cardData.type === 'top-up' && 'customer' in cardData) {
                ctx.font = '12px sans-serif';
                ctx.fillStyle = '#AAAAAA';
                ctx.fillText('TOP-UP CONFIRMATION FOR:', width / 2, 210);

                ctx.font = '600 28px sans-serif';
                ctx.fillStyle = 'white';
                ctx.fillText(cardData.customer.name, width / 2, 240);
            }

            // 5. Draw the Italian flag
            ctx.fillStyle = '#009246';
            ctx.fillRect(0, height - 3, width / 3, 3);
            ctx.fillStyle = '#F1F2F1';
            ctx.fillRect(width / 3, height - 3, width / 3, 3);
            ctx.fillStyle = '#CE2B37';
            ctx.fillRect((width / 3) * 2, height - 3, width / 3, 3);

            // 6. Export to Blob and share
            const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
            
            if (!pngBlob) throw new Error("Could not generate PNG from canvas.");

            const file = new File([pngBlob], 'gift-card.png', { type: 'image/png' });

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Cafe Roma Gift Card' });
            } else {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pngBlob);
                link.download = 'gift-card.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }
        } catch (error) {
            console.error('Share failed:', error);
            alert('Could not generate the gift card image for sharing.');
        }
    };
    
    if (!isOpen || !cardData) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 animate-fade-in-pop" onClick={onClose}>
                <div className="bg-bg-panel rounded-lg shadow-2xl p-6 w-full max-w-sm text-text-primary" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-accent">{cardData.type === 'top-up' ? 'Top-up Confirmation' : 'Shareable Gift Card'}</h2>
                        <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><Icon name="close" className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="flex items-center justify-center py-4">
                      <div className="w-[300px] h-[420px] flex-shrink-0">
                          <GiftCardContent cardData={cardData} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-color">
                        <button onClick={handleShare} className="bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                           <Icon name="share" className="w-5 h-5"/>
                           Share
                        </button>
                         <button onClick={() => setCardToPrint(cardData)} className="bg-text-secondary/80 text-bg-main font-bold py-3 rounded-lg hover:bg-text-secondary/100 flex items-center justify-center gap-2">
                            <Icon name="print" className="w-5 h-5"/>
                            Print
                        </button>
                    </div>
                     <button onClick={onClose} className="w-full mt-4 bg-accent text-text-on-accent font-bold py-3 rounded-lg hover:bg-accent-hover">
                        New Sale
                    </button>
                </div>
            </div>
            {cardToPrint && <PrintGiftCard cardData={cardToPrint} onPrintComplete={() => setCardToPrint(null)} />}
        </>
    );
};

export default ShareableGiftCardModal;
