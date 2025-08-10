import React, { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import Icon from './Icon';

interface QRCodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: string) => void;
  onCreateNewCustomer: () => void;
  onFindCustomer: () => void;
}

// A more descriptive state machine for the camera's lifecycle.
type CameraStatus = 
  | 'idle'                // Not doing anything
  | 'starting'            // In the process of getting user media and playing
  | 'streaming'           // Camera is active and scanning
  | 'requires_interaction' // Autoplay was blocked, waiting for user tap
  | 'error'               // A terminal error occurred
  | 'found';              // A QR code was successfully found

const QRCodeScannerModal = ({ isOpen, onClose, onScanSuccess, onCreateNewCustomer, onFindCustomer }: QRCodeScannerModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Use a ref for status inside the scan loop to avoid re-creating the function on every render
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  
  // --- Core Scanning Logic ---
  const scanLoop = useCallback(() => {
    // Ensure we don't continue scanning if a code was found or modal is closed
    if (statusRef.current !== 'streaming' || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
                setStatus('found');
                onScanSuccess(code.data);
                return; // Exit the loop
            }
        }
    }
    animationFrameIdRef.current = requestAnimationFrame(scanLoop);
  }, [onScanSuccess]);


  // --- Camera Management ---
  const stopCamera = useCallback(() => {
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setStatus('starting');
    setErrorMessage('');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error('Video element not available.');
      }
      
      video.srcObject = stream;
      // 'play()' returns a promise. We must handle its success and failure.
      await video.play();

      // If we reach here, autoplay succeeded.
      setStatus('streaming');

    } catch (err: any) {
      console.warn("Camera start failed:", err.name, err.message);
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings.');
        setStatus('error');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage('Could not access the camera. It might be in use by another application.');
        setStatus('error');
      } else if (err.name === 'NotFoundError') {
          setErrorMessage('No compatible camera was found on your device.');
          setStatus('error');
      } else if (err.name === 'AbortError' || err.name === 'NotAllowedError') {
        // This is the key state for iOS PWA and other browsers that block autoplay
        setStatus('requires_interaction');
      } else {
        setErrorMessage('An unexpected error occurred while starting the camera.');
        setStatus('error');
      }
    }
  }, []);

  // Effect to manage the camera lifecycle based on the modal's open state
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setStatus('idle');
    }

    // A robust cleanup function is critical
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);
  
  // Effect to start/stop the scanning loop based on streaming status
  useEffect(() => {
    if (status === 'streaming') {
      animationFrameIdRef.current = requestAnimationFrame(scanLoop);
    } else {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    }
    
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [status, scanLoop]);

  // Handler for user interaction when autoplay is blocked
  const handleActivateCamera = async () => {
    if (status !== 'requires_interaction' || !videoRef.current) return;
    try {
      await videoRef.current.play();
      setStatus('streaming');
    } catch (err) {
      console.error("Manual camera play failed:", err);
      setErrorMessage("Failed to activate camera on tap. Please check permissions.");
      setStatus('error');
    }
  };

  // --- UI Rendering Logic ---
  const renderOverlayContent = () => {
    switch (status) {
      case 'starting':
        return (
          <div className="flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-text-secondary">Starting camera...</p>
          </div>
        );
      case 'requires_interaction':
        return (
          <div className="text-center p-4 cursor-pointer">
            <p className="font-semibold text-xl">Tap to activate camera</p>
            <p className="text-sm text-text-secondary mt-1">Your browser requires interaction to start the video.</p>
          </div>
        );
      case 'streaming':
        return (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/50 text-center pointer-events-none">
            <p>Align QR code within the frame</p>
          </div>
        );
      case 'found':
        return (
          <div className="bg-green-500/80 flex items-center justify-center">
            <Icon name="checkCircle" className="w-24 h-24 text-white"/>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-800/80 flex flex-col items-center justify-center p-4 text-center">
            <Icon name="xCircle" className="w-16 h-16 text-white mb-4"/>
            <p className="font-semibold">Camera Error</p>
            <p className="text-sm mb-4">{errorMessage}</p>
            <button onClick={startCamera} className="bg-accent text-text-on-accent font-bold py-2 px-4 rounded-lg">Try Again</button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
        className={`fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 ${isOpen ? 'animate-fade-in-pop' : 'hidden'}`} 
        onClick={onClose}
    >
      <div 
        className="bg-bg-panel rounded-lg shadow-2xl w-full max-w-lg text-text-primary flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <header className="w-full flex justify-between items-center p-4 bg-bg-panel rounded-t-lg flex-shrink-0">
          <h2 className="text-xl font-bold text-accent">Scan Customer QR Code</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </header>
        <div 
            className="relative flex-grow bg-black overflow-hidden flex items-center justify-center aspect-square" 
            onClick={handleActivateCamera}
        >
          <video
            ref={videoRef}
            playsInline // Crucial for iOS Safari
            muted // Often required for autoplay
            className="w-full h-full object-cover"
            // This hint can sometimes help with rendering bugs on mobile.
            style={{ transform: 'translateZ(0)' }} 
          />
          {/* Overlay is now separate and covers the video */}
          <div className="absolute inset-0 flex items-center justify-center">
            {renderOverlayContent()}
          </div>
        </div>
        <div className="p-4 border-t border-border-color/50 text-center flex-shrink-0">
            <div className="flex justify-center items-stretch gap-4">
                <button 
                    onClick={onFindCustomer} 
                    className="flex-1 bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-blue-700 transition-colors flex flex-col items-center justify-center gap-2"
                >
                    <Icon name="users" className="w-6 h-6"/>
                    <span className="text-sm">Find Member</span>
                </button>
                <button 
                    onClick={onCreateNewCustomer} 
                    className="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:bg-green-700 transition-colors flex flex-col items-center justify-center gap-2"
                >
                    <Icon name="plus" className="w-6 h-6"/>
                    <span className="text-sm">New Member</span>
                </button>
            </div>
        </div>
        {/* The canvas is used for processing frames and can be hidden */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default QRCodeScannerModal;