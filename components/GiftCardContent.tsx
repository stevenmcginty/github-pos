import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Customer, UnclaimedGiftCard } from '../types';

interface GiftCardContentProps {
    cardData: {
        type: 'top-up';
        amount: number;
        customer: Customer;
    } | {
        type: 'physical-card';
        card: UnclaimedGiftCard;
    } | null;
}

const GiftCardContent = ({ cardData }: GiftCardContentProps) => {
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (qrCanvasRef.current && cardData?.type === 'physical-card') {
            const qrContent = JSON.stringify({ type: 'unclaimed-gift-card', id: cardData.card.id });
            // QR code size for better scannability
            QRCode.toCanvas(qrCanvasRef.current, qrContent, { width: 120, margin: 1, errorCorrectionLevel: 'H' }, (err) => {
                if (err) console.error("Failed to generate QR code:", err);
            });
        }
    }, [cardData]);

    if (!cardData) return null;

    const { type } = cardData;
    const amount = type === 'top-up' ? cardData.amount : cardData.card.amount;
    
    return (
        <div 
            className="relative w-full h-full bg-[#1a1a1a] text-white font-serif rounded-2xl shadow-lg flex flex-col items-center justify-center p-6 gap-y-8 overflow-hidden"
            style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d4af37\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            }}
        >
            <div className="text-center">
                <h3 className="font-bold text-base text-amber-300 tracking-widest">GIFT CARD</h3>
                <p className="text-5xl font-bold text-white mt-1">£{amount.toFixed(2)}</p>
            </div>

            <div>
                 {type === 'physical-card' ? (
                    <div className="bg-white p-1 rounded-lg shadow-md">
                        <canvas ref={qrCanvasRef} width="120" height="120" />
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="text-sm text-gray-300">TOP-UP FOR:</p>
                        <p className="font-semibold text-2xl text-white mt-1">{('customer' in cardData && cardData.customer.name) || ''}</p>
                    </div>
                )}
            </div>
            
            <div>
                 {type === 'physical-card' && (
                    <p className="text-sm text-amber-400/80">PRESENT QR TO REDEEM</p>
                 )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1.5 flex z-20">
                <div className="flex-1" style={{ backgroundColor: '#009246' }}></div>
                <div className="flex-1" style={{ backgroundColor: '#F1F2F1' }}></div>
                <div className="flex-1" style={{ backgroundColor: '#CE2B37' }}></div>
            </div>
        </div>
    );
};

export default GiftCardContent;
