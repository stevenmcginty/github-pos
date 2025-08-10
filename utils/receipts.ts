
import { Sale, SaleItem } from '../types';

const generateItemText = (item: SaleItem, level = 0): string => {
    let text = '';
    const price = item.priceAtSale ?? (item as any).price;
    const itemTotal = `£${(price * item.quantity).toFixed(2)}`;
    const indent = ' '.repeat(level * 4);
    const prefix = level > 0 ? '+ ' : `${item.quantity}x `;

    text += `${indent}${`${prefix}${item.name}`.padEnd(25 - (level*4), ' ')}${itemTotal.padStart(10, ' ')}\n`;

    if (item.notes) {
        text += `${indent}    ↳ ${item.notes}\n`;
    }
    if (item.linkedItems) {
        item.linkedItems.forEach(linked => {
            text += generateItemText(linked, level + 1);
        });
    }
    return text;
};

export const createPlainTextReceipt = (sale: Sale): string => {
    const subtotal = sale.total + (sale.discount || 0) - sale.totalVat;
    let receipt = `CAFE ROMA RECEIPT\n\n`;
    receipt += `Sale ID: ${sale.id.slice(0, 8)}\n`;
    receipt += `Date: ${new Date(sale.date).toLocaleString('en-GB')}\n\n`;
    receipt += `--------------------------------\n`;
    
    sale.items.forEach(item => {
        receipt += generateItemText(item);
    });

    receipt += `--------------------------------\n`;
    const preDiscountTotal = subtotal + sale.totalVat;
    receipt += `${'Subtotal:'.padEnd(25, ' ')}${`£${preDiscountTotal.toFixed(2)}`.padStart(10, ' ')}\n`;
    receipt += `${'VAT:'.padEnd(25, ' ')}${`£${sale.totalVat.toFixed(2)}`.padStart(10, ' ')}\n`;
    if (sale.discount && sale.discount > 0) {
        receipt += `${'Discount:'.padEnd(25, ' ')}${`-£${sale.discount.toFixed(2)}`.padStart(10, ' ')}\n`;
    }
    receipt += `${'TOTAL:'.padEnd(25, ' ')}${`£${sale.total.toFixed(2)}`.padStart(10, ' ')}\n\n`;
    receipt += `Payment Method: ${sale.paymentMethod}\n\n`;
    receipt += `Thank you for your visit!\n`;
    receipt += `Cafe Roma, 79a St. Peters Street, St. Albans, AL1 3EG\n`;
    receipt += `VAT Reg: 471425988\n`;
    return receipt;
};

export const shareReceipt = async (sale: Sale) => {
  const receiptText = createPlainTextReceipt(sale);
  const shareData = {
    title: 'Your Cafe Roma Receipt',
    text: receiptText,
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      alert('Sharing is not supported on this browser.');
    }
  } catch (err) {
    console.error('Error sharing receipt:', err);
  }
};
