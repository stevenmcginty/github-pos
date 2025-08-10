import React, { useEffect } from 'react';
import { Sale } from '../types';
import ReceiptContent from './ReceiptContent';

interface PrintReceiptProps {
  sale: Sale | null;
  onPrintComplete: () => void;
}

const PrintReceipt = ({ sale, onPrintComplete }: PrintReceiptProps) => {
  useEffect(() => {
    if (sale) {
      document.body.classList.add('print-mode-receipt');

      const handleAfterPrint = () => {
        document.body.classList.remove('print-mode-receipt');
        onPrintComplete();
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      
      // A small timeout allows React to render the new receipt content
      // before the print dialog is triggered.
      setTimeout(() => {
        window.print();
      }, 50);

      // Cleanup listener if component unmounts before printing is done
      return () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        document.body.classList.remove('print-mode-receipt');
      };
    }
  }, [sale, onPrintComplete]);

  if (!sale) {
    return null;
  }

  return (
    <div className="print-section">
      <ReceiptContent sale={sale} />
    </div>
  );
};

export default PrintReceipt;