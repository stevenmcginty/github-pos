import React, { useEffect, useMemo } from 'react';
import { OpenTab, OrderType, CartItem } from '../types';
import { calculateVatAmount, getEffectiveVatRate } from '../utils/vat';

interface PrintBillModalProps {
  openTab: OpenTab | null;
  onPrintComplete: () => void;
}

const renderBillItem = (item: CartItem, orderType: OrderType, level = 0): JSX.Element[] => {
  const mainPrice = orderType === 'Eat In' ? item.priceEatIn : item.priceTakeAway;
  
  let totalLinePrice = mainPrice;
  if(item.linkedItems){
      totalLinePrice += item.linkedItems.reduce((acc, extra) => acc + (orderType === 'Eat In' ? extra.priceEatIn : extra.priceTakeAway), 0);
  }

  const elements: JSX.Element[] = [];

  elements.push(
    <tr key={item.instanceId}>
      <td className="text-left py-1 align-top pr-2" style={{ paddingLeft: `${level * 16}px` }}>
        {item.quantity}x
      </td>
      <td className="text-left py-1">
        {item.name}
        {item.notes && <div className="text-xs italic pl-2 text-gray-600">↳ {item.notes}</div>}
         {item.linkedItems && item.linkedItems.map(linked => (
            <div key={linked.instanceId} className="text-xs text-gray-600 pl-2">
                + {linked.name} (£{(orderType === 'Eat In' ? linked.priceEatIn : linked.priceTakeAway).toFixed(2)})
            </div>
        ))}
      </td>
      <td className="text-right py-1">£{(totalLinePrice * item.quantity).toFixed(2)}</td>
    </tr>
  );

  return elements;
};

const BillContent = ({ openTab }: { openTab: OpenTab }) => {
  const { cart, orderType, discount, tableName } = openTab;

  const { grossTotal, discountAmount, finalTotal } = useMemo(() => {
    const calculateItemTotal = (item: CartItem): number => {
        let itemPrice = orderType === OrderType.EatIn ? item.priceEatIn : item.priceTakeAway;
        if (item.linkedItems) {
            itemPrice += item.linkedItems.reduce((extraAcc, extra) => extraAcc + (orderType === OrderType.EatIn ? extra.priceEatIn : extra.priceTakeAway), 0);
        }
        return itemPrice * item.quantity;
    };

    const gross = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
      
    const discountVal = parseFloat(discount);
    const discountPercent = !isNaN(discountVal) ? Math.max(0, Math.min(100, discountVal)) : 0;
    const calculatedDiscountAmount = (gross * discountPercent) / 100;
    
    return { 
        grossTotal: gross, 
        discountAmount: calculatedDiscountAmount, 
        finalTotal: Math.max(0, gross - calculatedDiscountAmount) 
    };
  }, [cart, orderType, discount]);

  return (
    <div className="bg-white p-4 font-mono text-sm receipt-text-content">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold">Cafe Roma</h3>
        <p className="text-xs">Pro-Forma Bill for Table: {tableName}</p>
        <p className="text-xs">Date: {new Date().toLocaleString('en-GB')}</p>
      </div>
      <table className="w-full my-2 text-xs">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left font-semibold pb-1 pr-2">QTY</th>
            <th className="text-left font-semibold pb-1">ITEM</th>
            <th className="text-right font-semibold pb-1">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {cart.map(item => (
            <React.Fragment key={item.instanceId}>
              {renderBillItem(item, orderType)}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black pt-2 mt-2 text-xs">
        <div className="flex justify-between">
          <p>Subtotal</p>
          <p>£{grossTotal.toFixed(2)}</p>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between">
            <p>Discount</p>
            <p>-£{discountAmount.toFixed(2)}</p>
          </div>
        )}
        <div className="flex justify-between font-bold text-base mt-2">
          <p>TOTAL DUE</p>
          <p>£{finalTotal.toFixed(2)}</p>
        </div>
      </div>
       <div className="text-center mt-4 text-xs">
        <p>Please pay at the counter. Thank you!</p>
      </div>
    </div>
  );
};

const PrintBillModal = ({ openTab, onPrintComplete }: PrintBillModalProps) => {
  useEffect(() => {
    if (openTab) {
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
  }, [openTab, onPrintComplete]);

  if (!openTab) {
    return null;
  }

  return (
    <div className="print-bill-section">
      <BillContent openTab={openTab} />
    </div>
  );
};

export default PrintBillModal;