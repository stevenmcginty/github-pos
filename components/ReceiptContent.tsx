
import React from 'react';
import { Sale, SaleItem } from '../types';

interface ReceiptContentProps {
  sale: Sale;
}

const renderSaleItem = (item: SaleItem, level = 0): JSX.Element[] => {
  const price = item.priceAtSale ?? (item as any).price; // Use priceAtSale, fallback for old data
  const elements: JSX.Element[] = [];

  elements.push(
    <tr key={item.id + (item.notes || '') + level}>
      <td className="text-left py-1 align-top pr-2" style={{ paddingLeft: `${level * 16}px` }}>{level === 0 ? '1x' : ''}</td>
      <td className="text-left py-1">
        {level > 0 && <span className="text-gray-500">+ </span>}
        {item.name}
        {item.notes && <div className="text-xs italic pl-2 text-gray-600">↳ {item.notes}</div>}
      </td>
      <td className="text-right py-1">£{price.toFixed(2)}</td>
    </tr>
  );

  if (item.linkedItems) {
    item.linkedItems.forEach(linked => {
      elements.push(...renderSaleItem(linked, level + 1));
    });
  }

  return elements;
};

const ReceiptContent = ({ sale }: ReceiptContentProps) => {
  // If a discount was applied, the sale.total is the discounted amount.
  // To show the correct breakdown, we calculate the pre-discount total.
  const preDiscountTotal = sale.total + (sale.discount || 0);
  const subtotal = preDiscountTotal - sale.totalVat;

  const unrolledItems = sale.items.flatMap(item => 
    Array.from({ length: item.quantity }, (_, i) => ({ ...item, uniqueId: `${item.id}-${item.notes || ''}-${JSON.stringify(item.linkedItems)}-${i}` }))
  );

  return (
    <div className="bg-white p-4 font-mono text-sm receipt-text-content">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold">Cafe Roma</h3>
        <p className="text-xs">79a St. Peters Street</p>
        <p className="text-xs">St. Albans, AL1 3EG</p>
        <p className="text-xs">VAT Reg: 471425988</p>
      </div>
      <div className="border-t border-b border-dashed border-black py-2 my-2 text-xs">
        <p>Sale ID: {sale.id.slice(0, 8)}</p>
        <p>Date: {new Date(sale.date).toLocaleString('en-GB')}</p>
        <p>Payment: {sale.paymentMethod}</p>
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
          {unrolledItems.map(item => (
            <React.Fragment key={item.uniqueId}>
              {renderSaleItem(item)}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black pt-2 mt-2 text-xs">
        <div className="flex justify-between">
          <p>Subtotal</p>
          <p>£{subtotal.toFixed(2)}</p>
        </div>
        <div className="flex justify-between">
          <p>VAT</p>
          <p>£{sale.totalVat.toFixed(2)}</p>
        </div>
        {sale.discount && sale.discount > 0 && (
          <div className="flex justify-between">
            <p>Discount</p>
            <p>-£{sale.discount.toFixed(2)}</p>
          </div>
        )}
        <div className="flex justify-between font-bold text-base mt-2">
          <p>TOTAL</p>
          <p>£{sale.total.toFixed(2)}</p>
        </div>
      </div>
      <div className="text-center mt-4 text-xs">
        <p>Thank you for your visit!</p>
      </div>
    </div>
  );
};

export default ReceiptContent;
