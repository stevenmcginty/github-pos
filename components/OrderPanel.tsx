import React, { useState, useMemo, useEffect, useRef } from 'react';
import { OrderType, PaymentMethod, Product, OpenTab, Table, Customer } from '../types';
import CartItemComponent from './CartItem';
import Icon from './Icon';
import InstallPWAButton from './InstallPWAButton';
import ItemNoteModal from './ItemNoteModal';
import { triggerHapticFeedback } from '../utils/haptics';

// Directly use the hook's return type for props, ensuring type safety.
import { useCart } from '../hooks/useCart';

type OrderPanelProps = {
  cartHook: ReturnType<typeof useCart>;
  onChargeRequest: (paymentMethod: PaymentMethod) => void;
  onLinkCustomer: () => void;
  tables: Table[];
  openTabs: OpenTab[];
  onAddExtraRequest: (forItemInstanceId: string) => void;
  customer?: Customer;
};

export default function OrderPanel({ cartHook, onChargeRequest, onLinkCustomer, tables, openTabs, onAddExtraRequest, customer }: OrderPanelProps) {
  const {
    cart, setOrderType, orderType, setPaymentMethod, paymentMethod, setCashTendered, cashTendered,
    setDiscount, discount, totals, payment, clearCart, isTabActive, tableName,
    detachFromTabAndStartNewOrder, handleQuantityChange, handleRemoveFromCart, updateItemNote,
    addExtraToItem, removeExtraFromItem, availablePointsForRedemption, redeemItem, unRedeemItem,
    isGiftCardPaymentActive, giftCardAmountApplied, applyGiftCardBalance, removeGiftCardBalance,
  } = cartHook;

  const [isExpandedOnMobile, setIsExpandedOnMobile] = useState(false);
  const [itemNoteState, setItemNoteState] = useState<{ isOpen: boolean, forItemInstanceId: string | null, initialNote?: string }>({ isOpen: false, forItemInstanceId: null });

  const handleChargeClick = () => {
    triggerHapticFeedback();
    onChargeRequest(paymentMethod);
  };
  
  const handleOpenNoteModal = (instanceId: string, initialNote?: string) => {
    setItemNoteState({ isOpen: true, forItemInstanceId: instanceId, initialNote });
  };

  const handleSaveNote = (note: string) => {
    if (itemNoteState.forItemInstanceId) {
      updateItemNote(itemNoteState.forItemInstanceId, note);
    }
    setItemNoteState({ isOpen: false, forItemInstanceId: null });
  };

  const quickCashAmounts = [5, 10, 20, 50];
  const cartItemsCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);


  return (
    <>
       {/* Backdrop for expanded mobile cart */}
      <div 
        className={`lg:hidden fixed inset-0 bg-black transition-opacity duration-300 z-10 ${isExpandedOnMobile ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsExpandedOnMobile(false)}
      />
    
      <aside 
        className={`
          /* SHARED */
          flex flex-col bg-bg-panel transition-transform duration-300 ease-in-out
          
          /* MOBILE (default) */
          fixed bottom-0 left-0 right-0 z-20 max-h-[85vh] rounded-t-2xl border-t border-border-color/50 shadow-2xl
          
          /* DESKTOP (lg) */
          lg:relative lg:w-[420px] lg:h-full lg:max-h-full lg:rounded-none lg:shadow-2xl lg:border-t-0
          
          /* DYNAMIC MOBILE STYLES */
          ${isExpandedOnMobile 
              ? 'translate-y-0 bg-bg-panel/90 backdrop-blur-lg' 
              : 'translate-y-[calc(100%-7rem)]'
          }
          lg:translate-y-0
        `}
      >
        {/* -- Header / Peek Bar (dual purpose) -- */}
        <div 
          className="flex-shrink-0 p-4 cursor-pointer lg:cursor-auto"
          onClick={() => {
            if (window.innerWidth < 1024) { // Only toggle on mobile
              triggerHapticFeedback();
              setIsExpandedOnMobile(!isExpandedOnMobile);
            }
          }}
        >
          <div className="w-10 h-1.5 bg-text-secondary/50 rounded-full mx-auto mb-3 lg:hidden" />
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-accent">{isTabActive ? `Table: ${tableName}` : 'Current Order'}</h2>
               <p className="text-sm text-text-secondary">{cartItemsCount} item{cartItemsCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">£{totals.finalTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* -- Main Content Wrapper (for scrolling) -- */}
        <div className="flex-grow flex flex-col min-h-0 px-4 pb-4 lg:p-0">
          <header className="hidden lg:flex justify-between items-center mb-4 px-4 pt-4">
             <h2 className="text-2xl font-bold text-accent">{isTabActive ? `Table: ${tableName}` : 'Current Order'}</h2>
            <div className="flex items-center gap-2">
              {isTabActive && <button onClick={detachFromTabAndStartNewOrder} className="text-sm bg-bg-main px-3 py-1 rounded-md hover:bg-opacity-80">New Order</button>}
              <button onClick={clearCart} className="text-sm bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700">Clear</button>
            </div>
          </header>

          <div className="flex items-center gap-2 mb-4 lg:mx-4">
            <button
              onClick={() => { triggerHapticFeedback(); setOrderType(OrderType.EatIn); }}
              className={`flex-1 py-3 font-bold rounded-lg transition-colors ${orderType === OrderType.EatIn ? 'bg-accent text-text-on-accent' : 'bg-bg-main hover:bg-opacity-80'}`}
            >
              Eat In
            </button>
            <button
              onClick={() => { triggerHapticFeedback(); setOrderType(OrderType.TakeAway); }}
              className={`flex-1 py-3 font-bold rounded-lg transition-colors ${orderType === OrderType.TakeAway ? 'bg-accent text-text-on-accent' : 'bg-bg-main hover:bg-opacity-80'}`}
            >
              Take Away
            </button>
          </div>

          <div className="flex-grow overflow-y-auto bg-bg-main rounded-lg p-3 min-h-0 lg:mx-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                <Icon name="shoppingCart" className="w-16 h-16 opacity-30" />
                <p className="mt-4">Your order is empty</p>
              </div>
            ) : (
              cart.map(item => (
                <CartItemComponent 
                  key={item.instanceId} 
                  item={item} 
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveFromCart}
                  onAddNote={handleOpenNoteModal}
                  onAddExtraRequest={() => onAddExtraRequest(item.instanceId)}
                  onRemoveExtra={removeExtraFromItem}
                  orderType={orderType}
                  customer={customer}
                  availablePoints={availablePointsForRedemption}
                  redeemItem={redeemItem}
                  unRedeemItem={unRedeemItem}
                />
              ))
            )}
          </div>

          <div className="pt-4 flex-shrink-0 lg:px-4">
              <div className="bg-bg-main p-3 rounded-lg space-y-2">
                  <div className="flex justify-between text-text-secondary">
                      <span>Subtotal</span>
                      <span>£{totals.grossTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-text-secondary">
                      <span>Discount (%)</span>
                      <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className="w-20 bg-bg-panel text-text-primary text-right font-semibold rounded-md p-1 border border-border-color"/>
                  </div>
                   <div className="flex justify-between text-text-secondary">
                      <span>Discount Amount</span>
                      <span>- £{totals.discountAmount.toFixed(2)}</span>
                  </div>
                  {isGiftCardPaymentActive && (
                    <div className="flex justify-between font-semibold text-cyan-400">
                      <span>Gift Card Applied</span>
                      <span>- £{giftCardAmountApplied.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-2xl border-t border-border-color pt-2 mt-2 text-text-primary">
                      <span>Total</span>
                      <span className="text-accent">£{totals.remainingTotal.toFixed(2)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <button onClick={() => { triggerHapticFeedback(); setPaymentMethod(PaymentMethod.Cash); }} className={`py-3 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${paymentMethod === PaymentMethod.Cash && !isGiftCardPaymentActive ? 'bg-accent text-text-on-accent' : 'bg-bg-main hover:bg-opacity-80'}`} disabled={isGiftCardPaymentActive && totals.remainingTotal <= 0}>
                  <Icon name="cash" className="w-5 h-5"/> Cash
                </button>
                <button onClick={() => { triggerHapticFeedback(); setPaymentMethod(PaymentMethod.Card); }} className={`py-3 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${paymentMethod === PaymentMethod.Card && !isGiftCardPaymentActive ? 'bg-accent text-text-on-accent' : 'bg-bg-main hover:bg-opacity-80'}`} disabled={isGiftCardPaymentActive && totals.remainingTotal <= 0}>
                  <Icon name="card" className="w-5 h-5"/> Card
                </button>
              </div>
              
              {paymentMethod === PaymentMethod.Cash && !isGiftCardPaymentActive && totals.remainingTotal > 0 && (
                  <div className="mt-3">
                      <label className="text-sm font-medium text-text-secondary">Cash Tendered</label>
                      <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-secondary">£</span>
                          <input type="number" value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} step="0.01" className="pl-7 w-full p-2 bg-bg-main border border-border-color rounded-md"/>
                      </div>
                      {payment.tenderedError && <p className="text-red-500 text-xs mt-1">{payment.tenderedError}</p>}
                      <div className="grid grid-cols-5 gap-2 mt-2">
                          <button onClick={() => setCashTendered(totals.remainingTotal.toFixed(2))} className="bg-bg-main py-2 rounded-md font-semibold text-sm">Exact</button>
                          {quickCashAmounts.map(amount => ( <button key={amount} onClick={() => setCashTendered(amount.toString())} className="bg-bg-main py-2 rounded-md font-semibold text-sm">£{amount}</button> ))}
                      </div>
                      {payment.changeDue !== null && <p className="mt-2 text-lg text-accent font-bold">Change Due: £{payment.changeDue.toFixed(2)}</p>}
                  </div>
              )}
               <div className="mt-3 flex flex-col gap-2">
                    {customer && (customer.giftCardBalance || 0) > 0 && (
                        <button 
                          onClick={() => { triggerHapticFeedback(); isGiftCardPaymentActive ? removeGiftCardBalance() : applyGiftCardBalance(); }} 
                          className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${isGiftCardPaymentActive ? 'bg-cyan-500 text-white' : 'bg-bg-main hover:bg-opacity-80'}`}
                        >
                            <Icon name="star" className="w-5 h-5"/> 
                            {isGiftCardPaymentActive ? 'Remove Gift Card' : `Use Gift Card (£${(customer?.giftCardBalance || 0).toFixed(2)})`}
                        </button>
                    )}
                    <button onClick={onLinkCustomer} className={`w-full py-3 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors ${customer ? 'bg-purple-600 text-white' : 'bg-bg-main hover:bg-opacity-80'}`}>
                        <Icon name={customer ? 'edit' : 'link'} className="w-5 h-5"/> {customer ? `Linked: ${customer.name} (${customer.totalLoyaltyPoints.toLocaleString()} pts)` : 'Link Customer'}
                    </button>
               </div>
              
              <button 
                onClick={handleChargeClick} 
                disabled={!payment.isSaleCompletable} 
                className="w-full mt-3 bg-green-600 text-white font-bold py-4 rounded-lg text-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                  CHARGE
              </button>
          </div>
        </div>
      </aside>

      <ItemNoteModal isOpen={itemNoteState.isOpen} onClose={() => setItemNoteState({ isOpen: false, forItemInstanceId: null })} onSave={handleSaveNote} initialNote={itemNoteState.initialNote}/>
    </>
  );
}