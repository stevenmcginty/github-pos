import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Product, Table, Customer, OrderType } from '../types';
import Icon from './Icon';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import useLocalStorage from '../hooks/useLocalStorage';
import { triggerHapticFeedback } from '../utils/haptics';

type ParsedItem = { 
    productName: string; 
    quantity: number; 
    note?: string;
    extras?: { productName: string; quantity: number }[]; 
};

type ParsedCustomItem = {
    name: string;
    price: number;
    quantity: number;
};

type ParsedOrder = { 
    orderType?: OrderType; 
    tableName?: string; 
    customerName?: string; 
    items: ParsedItem[];
    customItems?: ParsedCustomItem[];
};

interface AIOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    tables: Table[];
    customers: Customer[];
    onAIParsedOrder: (order: ParsedOrder) => void;
    startListeningOnOpen?: boolean;
}

type AIExample = { inputText: string; jsonOutput: string };
type Status = 'idle' | 'listening' | 'transcribing' | 'processing' | 'confirming' | 'error';


const AIOrderModal = ({ isOpen, onClose, products, tables, customers, onAIParsedOrder, startListeningOnOpen }: AIOrderModalProps) => {
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState('');
    const [orderText, setOrderText] = useState('');
    const [parsedResult, setParsedResult] = useState<ParsedOrder | null>(null);
    const isOnline = useOnlineStatus();
    const [examples, setExamples] = useLocalStorage<AIExample[]>('ai-order-examples-v4-context', []);
    
    // Refs for audio recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        // Cleanup function to stop recording when modal is closed or component unmounts
        return () => {
            stopRecording();
        };
    }, [stopRecording]);

    useEffect(() => {
        if (!isOpen) {
            stopRecording();
            // Reset state when modal is closed
            setStatus('idle');
            setError('');
            setOrderText('');
            setParsedResult(null);
        }
    }, [isOpen, stopRecording]);
    
    const handleConfirm = () => {
        triggerHapticFeedback();
        if (orderText && parsedResult && (parsedResult.items.length > 0 || (parsedResult.customItems && parsedResult.customItems.length > 0))) {
            const newExample: AIExample = {
                inputText: orderText,
                jsonOutput: JSON.stringify(parsedResult)
            };
            setExamples(prev => [...prev, newExample].slice(-20));
        }
        if (parsedResult) {
            onAIParsedOrder(parsedResult);
        }
        onClose();
    };

    const handleToggleListening = useCallback(async () => {
        triggerHapticFeedback();
        if (status === 'listening') {
            stopRecording();
        } else {
            setStatus('idle');
            setError('');
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('Audio recording is not supported by your browser.');
                }
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                
                const mimeTypes = [
                    'audio/mp4', // Prioritize for iOS/Safari compatibility
                    'audio/webm;codecs=opus',
                    'audio/ogg;codecs=opus',
                    'audio/webm',
                ];
                const supportedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

                if (!supportedMimeType) {
                    throw new Error('No supported audio format found for recording.');
                }

                const recorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
                mediaRecorderRef.current = recorder;
                audioChunksRef.current = [];

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                recorder.onstop = async () => {
                    setStatus('processing');
                    const audioBlob = new Blob(audioChunksRef.current, { type: supportedMimeType });

                    if (audioBlob.size === 0) {
                        setError("No audio was recorded. Please check microphone permissions and try again.");
                        setStatus('error');
                        return;
                    }

                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    
                    reader.onerror = () => {
                        setError("Failed to read the recorded audio data.");
                        setStatus('error');
                    };

                    reader.onloadend = async () => {
                        const base64Audio = (reader.result as string).split(',')[1];
                        
                        if (!isOnline) {
                            setError("Processing requires an internet connection.");
                            setStatus('error');
                            return;
                        }
                        setError('');

                        const mainProducts = products.filter(p => p.category !== 'EXTRAS').map(p => `- ${p.name}`).join('\n');
                        const extraProducts = products.filter(p => p.category === 'EXTRAS').map(p => `- ${p.name}`).join('\n');
                        const tableNames = tables.map(t => `- ${t.name}`).join('\n');
                        const customerNames = customers.map(c => `- ${c.name}`).join('\n');
                        const examplesList = examples.map(ex => `* Order: "${ex.inputText}"\n* JSON: ${ex.jsonOutput}`).join('\n\n');
                        
                        const prompt = `
                            You are an expert order-taking assistant for a coffee shop. Your task is to accurately listen to the customer's spoken order in the provided audio file and convert it into a structured JSON object that includes both a transcription and the parsed order.

                            **Process:**
                            1. Listen to the audio and create a full, accurate transcription of the customer's order.
                            2. From your transcription, identify the overall context: Is it for "Eat In" or "Take Away"? Is a table mentioned? Is a customer name mentioned?
                            3. Identify all distinct main products and their quantities.
                            4. Identify any extras or special notes and associate them with the correct main product.
                            5. Check for custom items. If the user says "custom item", "manual item", or describes something not on the menu along with a price (e.g., "a slice of carrot cake for £4.50"), parse this into the \`customItems\` array.
                            6. Construct a single JSON object matching the required schema.

                            **CRITICAL RULES:**
                            - **Top-Level Fields:** The final output is ONE JSON object. It must have a \`transcription\` string and a \`parsedOrder\` object.
                            - **Product Name Matching:** Match the customer's request to the **fullest possible name** from the "Available Main Products" list. Modifiers like "large", "small" are part of the product name (e.g., "Latte Large"). Only use the \`note\` field for modifications not found in product names (e.g., "decaf", "extra hot").
                            - **Custom Item Handling:** For custom items, extract the item's name/description, its price (in numbers, e.g., "four pounds fifty" -> 4.50), and quantity. Add it to the \`customItems\` array. Do NOT try to match it with a product from the main list.
                            - **Order Type:** If the order is "for here", "eating in", or "in", set \`orderType\` to "Eat In". If it's "to go", "take away", or "out", set it to "Take Away".
                            - **Table/Customer Matching:** Find the CLOSEST match from the available lists for table and customer names.
                            - **Mains vs. Extras:** Only items from "Available Extras" can be in an \`extras\` array.
                            - **Strict JSON Output:** Your entire response must be ONLY the JSON object. No explanations, no markdown. If no items are matched, return a valid JSON object with an empty items array.

                            ---
                            **Verified Examples (Learn from these):**
                            * Order: "one large cappuccino eating and sitting at table one"
                            * JSON: {"transcription": "one large cappuccino eating and sitting at table one", "parsedOrder": {"orderType": "Eat In", "tableName": "Table 1", "items": [{"productName": "Cappuccino LARGE", "quantity": 1}]}}
                            
                            * Order: "This is for John Smith, to go, two lattes and a bacon sandwich"
                            * JSON: {"transcription": "This is for John Smith, to go, two lattes and a bacon sandwich", "parsedOrder": {"orderType": "Take Away", "customerName": "John Smith", "items": [{"productName": "Latte", "quantity": 2}, {"productName": "Bacon Sandwich", "quantity": 1}]}}
                            
                            * Order: "Hi can I get an americano and also a custom item, a slice of Victoria sponge for three pounds fifty"
                            * JSON: {"transcription": "Hi can I get an americano and also a custom item, a slice of Victoria sponge for three pounds fifty", "parsedOrder": {"items": [{"productName": "Americano", "quantity": 1}], "customItems": [{"name": "slice of Victoria sponge", "price": 3.50, "quantity": 1}]}}

                            ${examplesList}
                            ---

                            **Available Main Products:**
                            ${mainProducts}

                            **Available Extras:**
                            ${extraProducts}
                            
                            **Available Tables:**
                            ${tableNames}

                            **Available Customers:**
                            ${customerNames}
                        `;

                        const responseSchema = {
                            type: 'OBJECT',
                            properties: {
                                transcription: {
                                    type: 'STRING',
                                    description: "The full, accurate transcription of the customer's order from the audio."
                                },
                                parsedOrder: {
                                    type: 'OBJECT',
                                    description: "The structured JSON representation of the order.",
                                    properties: {
                                        orderType: {
                                            type: 'STRING',
                                            enum: ['Eat In', 'Take Away'],
                                        },
                                        tableName: { type: 'STRING' },
                                        customerName: { type: 'STRING' },
                                        items: {
                                            type: 'ARRAY',
                                            items: {
                                                type: 'OBJECT',
                                                properties: {
                                                    productName: { type: 'STRING' },
                                                    quantity: { type: 'INTEGER' },
                                                    note: { type: 'STRING' },
                                                    extras: {
                                                        type: 'ARRAY',
                                                        items: {
                                                            type: 'OBJECT',
                                                            properties: {
                                                                productName: { type: 'STRING' },
                                                                quantity: { type: 'INTEGER' }
                                                            },
                                                            required: ['productName', 'quantity']
                                                        }
                                                    }
                                                },
                                                required: ['productName', 'quantity']
                                            }
                                        },
                                        customItems: {
                                            type: 'ARRAY',
                                            items: {
                                                type: 'OBJECT',
                                                properties: {
                                                    name: { type: 'STRING' },
                                                    price: { type: 'NUMBER' },
                                                    quantity: { type: 'INTEGER' }
                                                },
                                                required: ['name', 'price', 'quantity']
                                            }
                                        }
                                    },
                                    required: ['items']
                                }
                            },
                            required: ['transcription', 'parsedOrder']
                        };

                        try {
                            const url = `/api-proxy/v1beta/models/gemini-2.5-flash:generateContent`;
                            const requestBody = {
                                contents: [{
                                    parts: [
                                        { inlineData: { mimeType: audioBlob.type, data: base64Audio } },
                                        { text: prompt }
                                    ]
                                }],
                                generationConfig: {
                                    responseMimeType: "application/json",
                                    responseSchema: responseSchema,
                                }
                            };

                            const apiResponse = await fetch(url, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(requestBody),
                            });

                            if (!apiResponse.ok) {
                                const errorBody = await apiResponse.json();
                                let errorMessage = errorBody.error?.message || `API request failed with status ${apiResponse.status}`;
                                throw new Error(errorMessage);
                            }

                            const responseData = await apiResponse.json();
                            const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

                            if (!text) {
                                throw new Error("The AI returned an empty or invalid response. Please try rephrasing the order.");
                            }

                            const parsedData: { transcription: string; parsedOrder: ParsedOrder } = JSON.parse(text.trim());

                            if (!parsedData.transcription || !parsedData.parsedOrder) {
                                throw new Error("The AI response was missing required fields (transcription or parsedOrder).");
                            }

                            setOrderText(parsedData.transcription);
                            setParsedResult(parsedData.parsedOrder);
                            setStatus('confirming');

                        } catch (err: any) {
                             let errorMessage = "An unknown error occurred while processing the order.";
                             if (err.message) {
                                 try {
                                     const errorJson = JSON.parse(err.message);
                                     if (errorJson.message) errorMessage = errorJson.message;
                                 } catch (e) {
                                     errorMessage = err.message;
                                 }
                             }
                             console.error("Error processing AI order:", err);
                             setError(errorMessage);
                             setStatus('error');
                        }
                    };
                };
                
                recorder.start();
                setOrderText('');
                setStatus('listening');

            } catch (err: any) {
                let message = `Could not start microphone: ${err.message}.`;
                if (err.name === 'NotAllowedError') {
                    message = "Microphone permission was denied. Please allow access in your browser settings and try again.";
                }
                setError(message);
                setStatus('error');
            }
        }
    }, [status, stopRecording, isOnline, products, tables, customers, examples, setExamples]);

    useEffect(() => {
        if (isOpen && startListeningOnOpen && status === 'idle') {
            handleToggleListening();
        }
    }, [isOpen, startListeningOnOpen, status, handleToggleListening]);

    const renderContent = () => {
        const isListening = status === 'listening';
        
        if (status === 'confirming' && parsedResult) {
            const hasCustomItems = parsedResult.customItems && parsedResult.customItems.length > 0;

            return (
                <>
                    <p className="text-text-secondary mb-4">
                        The AI understood the following. Please confirm if this is correct.
                    </p>
                     <div className="bg-bg-main p-2 rounded-lg border border-border-color mb-4">
                        <p className="text-xs font-semibold text-text-secondary">Heard:</p>
                        <p className="italic text-text-primary">"{orderText}"</p>
                    </div>

                    <div className="bg-bg-main p-4 rounded-lg border border-border-color max-h-60 overflow-y-auto">
                        <div className="space-y-2 mb-3 border-b border-border-color pb-3">
                            {parsedResult.orderType && <p className="font-semibold text-text-secondary"><strong>Type:</strong> {parsedResult.orderType}</p>}
                            {parsedResult.tableName && <p className="font-semibold text-text-secondary"><strong>Table:</strong> {parsedResult.tableName}</p>}
                            {parsedResult.customerName && <p className="font-semibold text-text-secondary"><strong>Customer:</strong> {parsedResult.customerName}</p>}
                            {!parsedResult.orderType && !parsedResult.tableName && !parsedResult.customerName && <p className="text-text-secondary italic">No extra details found.</p>}
                        </div>

                        {parsedResult.items.length === 0 && !hasCustomItems ? (
                            <p className="text-text-secondary text-center">The AI could not identify any items from your order.</p>
                        ) : (
                             <ul className="space-y-3">
                                {parsedResult.items.map((item, index) => (
                                    <li key={index}>
                                        <div className="flex justify-between items-center text-lg">
                                            <span className="text-text-primary">{item.productName}</span>
                                            <span className="font-bold text-accent">x {item.quantity}</span>
                                        </div>
                                         {item.note && <p className="text-sm text-blue-400 italic pl-6 mt-1">↳ Note: {item.note}</p>}
                                        {item.extras && item.extras.length > 0 && (
                                            <ul className="pl-6 mt-1 space-y-1">
                                                {item.extras.map((extra, extraIndex) => (
                                                    <li key={extraIndex} className="flex justify-between items-center text-sm text-green-400 italic">
                                                        <span>↳ + {extra.productName}</span>
                                                        <span>x {extra.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                                {hasCustomItems && parsedResult.customItems?.map((item, index) => (
                                     <li key={`custom-${index}`}>
                                        <div className="flex justify-between items-center text-lg">
                                            <div>
                                                <span className="text-text-primary">{item.name}</span>
                                                <span className="text-xs text-purple-400 italic ml-2">(Custom)</span>
                                            </div>
                                            <span className="font-bold text-accent">x {item.quantity}</span>
                                        </div>
                                        <p className="text-sm text-purple-400 italic pl-6">↳ Price: £{item.price.toFixed(2)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="mt-6 flex justify-between items-center">
                        <button onClick={() => {
                          triggerHapticFeedback();
                          setStatus('idle');
                          setParsedResult(null);
                        }} className="bg-text-secondary text-bg-main font-bold py-3 px-6 rounded-md hover:bg-opacity-90">
                            Incorrect
                        </button>
                        <button onClick={handleConfirm} className="bg-green-600 text-white font-bold py-3 px-6 rounded-md hover:bg-green-700 flex items-center gap-2">
                            <Icon name="checkCircle" className="w-5 h-5"/>
                            Confirm & Add
                        </button>
                    </div>
                </>
            );
        }

        return (
             <>
                <div className="flex flex-col items-center justify-center text-center h-48">
                    {status === 'idle' && (
                        <>
                            <p className="text-text-secondary mb-4">Tap the button below to start recording the customer's order.</p>
                             <button 
                                onClick={handleToggleListening}
                                disabled={!isOnline}
                                className="flex items-center justify-center gap-3 w-full max-w-xs py-4 rounded-lg text-lg font-bold transition-all duration-300 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                <Icon name="microphone" className="w-6 h-6"/>
                                <span>Start Listening</span>
                            </button>
                             {!isOnline && <p className="text-yellow-400 text-sm mt-2">An internet connection is required.</p>}
                        </>
                    )}
                    {isListening && (
                        <>
                            <p className="text-text-secondary mb-4">Recording audio... Tap the button to stop and process.</p>
                            <button onClick={handleToggleListening} className="flex items-center justify-center gap-3 w-full max-w-xs py-4 rounded-lg text-lg font-bold transition-all duration-300 bg-red-600 text-white animate-pulse">
                                <Icon name="microphone" className="w-6 h-6"/>
                                <span>Listening... (Tap to Stop)</span>
                            </button>
                        </>
                    )}
                    {(status === 'transcribing' || status === 'processing') && (
                        <>
                            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-3 text-text-secondary">
                                {status === 'transcribing' ? 'Transcribing audio...' : 'Processing order...'}
                            </p>
                        </>
                    )}
                </div>
                 {error && (
                    <div className="bg-red-900/20 border border-red-700 text-red-300 p-3 rounded-md text-sm text-center">
                        <p>{error}</p>
                        <button onClick={() => { setStatus('idle'); setError(''); }} className="mt-2 text-accent font-semibold hover:underline">Try Again</button>
                    </div>
                )}
            </>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 animate-fade-in-pop" onClick={onClose}>
            <div className="bg-bg-panel rounded-lg shadow-2xl p-8 w-full max-w-lg text-text-primary flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-accent flex items-center gap-2">
                        <Icon name="sparkles" className="w-6 h-6" />
                        AI Order Entry
                    </h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><Icon name="close" className="w-6 h-6" /></button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default AIOrderModal;