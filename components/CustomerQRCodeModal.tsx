import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Customer } from '../types';
import Icon from './Icon';

interface CustomerQRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer;
}

// A local sub-component to avoid duplicating the card layout JSX for the on-screen display.
const CardLayout = ({ customer, canvasRef }: { customer: Customer; canvasRef: React.RefObject<HTMLCanvasElement> }) => (
    <div id="digital-loyalty-card" className="bg-gradient-to-br from-blue-900 to-indigo-900 p-6 rounded-2xl shadow-xl border border-blue-700 flex flex-col items-center text-center relative overflow-hidden h-full w-full">
        <Icon name="star" className="w-8 h-8 text-yellow-400 mb-2" />
        <h3 className="text-3xl font-bold text-yellow-300 tracking-wider">Cafe Roma</h3>
        <p className="text-sm text-yellow-500 mb-4 font-light uppercase tracking-widest">Loyalty Card</p>
        
        <div className="bg-white p-3 rounded-xl shadow-md inline-block my-auto">
            <canvas ref={canvasRef} />
        </div>

        <p className="text-4xl font-bold text-white mt-auto pb-4">{customer.name}</p>

        <div className="absolute bottom-0 left-0 right-0 h-1.5 flex">
            <div className="flex-1" style={{ backgroundColor: '#009246' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#F1F2F1' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#CE2B37' }}></div>
        </div>
    </div>
);


const CustomerQRCodeModal = ({ isOpen, onClose, customer }: CustomerQRCodeModalProps) => {
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const [canShare, setCanShare] = useState(false);

    // Effect to render the on-screen canvas-based QR code for display purposes.
    useEffect(() => {
        if (isOpen && customer.id && qrCanvasRef.current) {
            const options = {
                width: 200,
                margin: 1,
                color: { dark: '#000000', light: '#FFFFFF' }
            };
            QRCode.toCanvas(qrCanvasRef.current, customer.id, options, error => error && console.error(error));
        }
        // Check for Web Share API support
        if (navigator.share) {
            setCanShare(true);
        }
    }, [isOpen, customer.id]);

    const escapeXml = (unsafe: string): string => {
        return unsafe.replace(/[<>&'"]/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return c;
            }
        });
    };
    
    const handleShare = async () => {
        if (!qrCanvasRef.current) {
            alert("Could not generate the loyalty card for sharing.");
            return;
        }

        try {
            // Step 1: Create the background SVG string
            const cardBackgroundSvg = `
                <svg width="350" height="500" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#1e3a8a;" />
                            <stop offset="100%" style="stop-color:#312e81;" />
                        </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" rx="16" ry="16" fill="url(#grad1)" />
                    <g text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif">
                         <g transform="translate(163, 20) scale(1.5)">
                            <path transform="translate(-12, -12)" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 21.03a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" fill="#facc15" />
                        </g>
                        <text x="175" y="75" font-size="28" font-weight="bold" fill="#fde047" letter-spacing="1">Cafe Roma</text>
                        <text x="175" y="95" font-size="12" fill="#fcd34d" letter-spacing="3" style="text-transform: uppercase;">Loyalty Card</text>
                        <rect x="75" y="120" width="200" height="200" rx="8" ry="8" fill="white" />
                        <text x="175" y="420" font-size="36" font-weight="bold" fill="white">${escapeXml(customer.name)}</text>
                    </g>
                    <rect x="0" y="497" width="116.67" height="3" fill="#009246" />
                    <rect x="116.67" y="497" width="116.67" height="3" fill="#F1F2F1" />
                    <rect x="233.34" y="497" width="116.67" height="3" fill="#CE2B37" />
                </svg>
            `;
            
            // Step 2: Convert to Blob and then PNG File
            const pngBlob = await new Promise<Blob | null>((resolve) => {
                const img = new Image();
                const svgBlob = new Blob([cardBackgroundSvg], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                img.onload = () => {
                    const compositeCanvas = document.createElement('canvas');
                    compositeCanvas.width = 350;
                    compositeCanvas.height = 500;
                    const ctx = compositeCanvas.getContext('2d');
                    if (!ctx) {
                        resolve(null);
                        URL.revokeObjectURL(url);
                        return;
                    }
                    
                    // Draw background
                    ctx.drawImage(img, 0, 0, 350, 500);
                    
                    // Draw QR code on top
                    if (qrCanvasRef.current) {
                        ctx.drawImage(qrCanvasRef.current, 75, 120, 200, 200);
                    }

                    compositeCanvas.toBlob(resolve, 'image/png');
                    URL.revokeObjectURL(url);
                };

                img.onerror = () => {
                    resolve(null);
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            });
            
            if (!pngBlob) throw new Error("Could not generate PNG from card.");

            // Step 3: Share
            const file = new File([pngBlob], 'loyalty-card.png', { type: 'image/png' });
            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Cafe Roma Loyalty Card' });
            } else {
                // Fallback for desktop/unsupported browsers
                const link = document.createElement('a');
                link.href = URL.createObjectURL(pngBlob);
                link.download = 'loyalty-card.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            }

        } catch (error) {
            console.error('Share failed:', error);
            alert('Could not generate the loyalty card for sharing.');
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 animate-fade-in-pop" onClick={onClose}>
            <div className="bg-bg-panel rounded-lg shadow-2xl p-6 w-full max-w-md text-text-primary" onClick={e => e.stopPropagation()}>
                <div className="w-full flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-accent">Digital Loyalty Card</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><Icon name="close" className="w-6 h-6" /></button>
                </div>
                
                <div className="h-[480px]">
                    <CardLayout customer={customer} canvasRef={qrCanvasRef} />
                </div>
                
                <div className="mt-6 text-sm text-text-secondary">
                    {canShare && (
                        <button 
                            onClick={handleShare}
                            className="w-full flex items-center justify-center gap-2 bg-text-secondary text-bg-main font-bold py-3 rounded-lg hover:bg-opacity-90 transition-colors mb-4"
                        >
                           <Icon name="share" className="w-5 h-5"/>
                           Share Card
                        </button>
                    )}
                    <h3 className="font-semibold text-text-primary mb-2">How to Use:</h3>
                    <p>
                      Tap 'Share Card' to send the loyalty card image to yourself or save it to your device.
                      Alternatively, take a screenshot to add to your phone's wallet app.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CustomerQRCodeModal;