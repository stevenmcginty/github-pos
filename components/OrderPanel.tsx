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
          flex flex-col bg-[#1a1a2e] border-l border-white/10 transition-transform duration-300 ease-in-out

          /* MOBILE (default) */
          fixed bottom-0 left-0 right-0 z-20 max-h-[85vh] rounded-t-2xl border-t border-white/10 shadow-2xl

          /* DESKTOP (lg) */
          lg:relative lg:w-[420px] lg:h-full lg:max-h-full lg:rounded-none lg:shadow-2xl lg:border-t-0

          /* DYNAMIC MOBILE STYLES */
          ${isExpandedOnMobile
              ? 'translate-y-0 bg-[#1a1a2e]/95 backdrop-blur-lg'
              : 'translate-y-[calc(100%-7rem)]'
          }
          lg:translate-y-0
        `}
      >
        {/* -- Header / Peek Bar (dual purpose) -- */}
        <div
          className="flex-shrink-0 p-4 cursor-pointer lg:cursor-auto border-b border-white/10"
          onClick={() => {
            if (window.innerWidth < 1024) { // Only toggle on mobile
              triggerHapticFeedback();
              setIsExpandedOnMobile(!isExpandedOnMobile);
            }
          }}
        >
          <div className="w-10 h-1.5 bg-white/30 rounded-full mx-auto mb-3 lg:hidden" />
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white">{isTabActive ? `Table: ${tableName}` : 'Current Order'}</h2>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mt-1">{cartItemsCount} item{cartItemsCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-black text-white">£{totals.finalTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        {/* -- Main Content Wrapper (for scrolling) -- */}
        <div className="flex-grow flex flex-col min-h-0 px-4 pb-4 lg:p-0">
          <header className="hidden lg:flex justify-between items-center mb-4 px-4 pt-4">
             <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">{isTabActive ? `Table: ${tableName}` : 'Current Order'}</h2>
            <div className="flex items-center gap-2">
              {isTabActive && <button onClick={detachFromTabAndStartNewOrder} className="text-[10px] font-black uppercase tracking-widest bg-[#161625] border border-white/10 text-white/70 px-3 py-2 rounded-xl hover:text-white hover:brightness-110 transition-all active:scale-95">New Order</button>}
              <button onClick={clearCart} className="text-[10px] font-black uppercase tracking-widest bg-red-600/80 text-white px-3 py-2 rounded-xl hover:brightness-110 transition-all active:scale-95">Clear</button>
            </div>
          </header>

          <div className="flex items-center gap-2 mb-4 lg:mx-4 bg-[#161625] p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => { triggerHapticFeedback(); setOrderType(OrderType.EatIn); }}
              className={`flex-1 py-3 font-black uppercase tracking-wider text-sm rounded-xl transition-all active:scale-95 ${orderType === OrderType.EatIn ? 'bg-accent text-black shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
            >
              Eat In
            </button>
            <button
              onClick={() => { triggerHapticFeedback(); setOrderType(OrderType.TakeAway); }}
              className={`flex-1 py-3 font-black uppercase tracking-wider text-sm rounded-xl transition-all active:scale-95 ${orderType === OrderType.TakeAway ? 'bg-accent text-black shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
            >
              Take Away
            </button>
          </div>

          <div className="flex-grow overflow-y-auto bg-[#13131d] rounded-xl p-3 min-h-0 lg:mx-4 border border-white/5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Icon name="shoppingCart" className="w-16 h-16 text-white/20" />
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/40">Your order is empty</p>
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
              <div className="bg-[#161625] p-4 rounded-xl space-y-2 border border-white/10">
                  <div className="flex justify-between text-white/50 text-sm">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-mono font-bold">£{totals.grossTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-white/50 text-sm">
                      <span className="font-medium">Discount (%)</span>
                      <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" className="w-20 bg-black/40 text-white text-right font-mono font-bold rounded-lg p-2 border border-white/10 focus:border-accent outline-none"/>
                  </div>
                   <div className="flex justify-between text-white/50 text-sm">
                      <span className="font-medium">Discount Amount</span>
                      <span className="font-mono font-bold">- £{totals.discountAmount.toFixed(2)}</span>
                  </div>
                  {isGiftCardPaymentActive && (
                    <div className="flex justify-between font-bold text-cyan-400 text-sm">
                      <span>Gift Card Applied</span>
                      <span className="font-mono">- £{giftCardAmountApplied.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-white/10 pt-3 mt-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Total</span>
                      <span className="font-mono text-3xl font-black text-white">£{totals.remainingTotal.toFixed(2)}</span>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <button onClick={() => { triggerHapticFeedback(); setPaymentMethod(PaymentMethod.Cash); }} className={`py-4 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${paymentMethod === PaymentMethod.Cash && !isGiftCardPaymentActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'bg-[#161625] border border-white/10 text-white/70 hover:text-white hover:brightness-110'}`} disabled={isGiftCardPaymentActive && totals.remainingTotal <= 0}>
                  <Icon name="cash" className="w-5 h-5"/> Cash
                </button>
                <button onClick={() => { triggerHapticFeedback(); setPaymentMethod(PaymentMethod.Card); }} className={`py-4 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${paymentMethod === PaymentMethod.Card && !isGiftCardPaymentActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-[#161625] border border-white/10 text-white/70 hover:text-white hover:brightness-110'}`} disabled={isGiftCardPaymentActive && totals.remainingTotal <= 0}>
                  <Icon name="card" className="w-5 h-5"/> Card
                </button>
              </div>
              
              {paymentMethod === PaymentMethod.Cash && !isGiftCardPaymentActive && totals.remainingTotal > 0 && (
                  <div className="mt-3 bg-[#161625] p-4 rounded-xl border border-white/10">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/50">Cash Tendered</label>
                      <div className="relative mt-2">
                          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-white/50 font-mono font-black text-xl">£</span>
                          <input type="number" value={cashTendered} onChange={(e) => setCashTendered(e.target.value)} step="0.01" className="pl-10 w-full p-4 bg-black/40 border-2 border-white/10 rounded-xl font-mono text-2xl font-black text-white text-center focus:border-emerald-500 outline-none"/>
                      </div>
                      {payment.tenderedError && <p className="text-red-400 text-xs mt-2 font-bold">{payment.tenderedError}</p>}
                      <div className="grid grid-cols-5 gap-2 mt-3">
                          <button onClick={() => setCashTendered(totals.remainingTotal.toFixed(2))} className="bg-[#13131d] border border-white/10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-white/70 hover:text-white hover:brightness-110 transition-all active:scale-95">Exact</button>
                          {quickCashAmounts.map(amount => ( <button key={amount} onClick={() => setCashTendered(amount.toString())} className="bg-[#13131d] border border-white/10 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-white/70 hover:text-white hover:brightness-110 transition-all active:scale-95">£{amount}</button> ))}
                      </div>
                      {payment.changeDue !== null && (
                        <div className="mt-4 bg-emerald-600/20 border border-emerald-500/30 rounded-xl p-4 text-center">
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70">Change Due</p>
                          <p className="font-mono text-3xl font-black text-emerald-400">£{payment.changeDue.toFixed(2)}</p>
                        </div>
                      )}
                  </div>
              )}
               <div className="mt-3 flex flex-col gap-2">
                    {customer && (customer.giftCardBalance || 0) > 0 && (
                        <button
                          onClick={() => { triggerHapticFeedback(); isGiftCardPaymentActive ? removeGiftCardBalance() : applyGiftCardBalance(); }}
                          className={`w-full py-3 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${isGiftCardPaymentActive ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-[#161625] border border-white/10 text-white/70 hover:text-white hover:brightness-110'}`}
                        >
                            <Icon name="star" className="w-5 h-5"/>
                            {isGiftCardPaymentActive ? 'Remove Gift Card' : `Use Gift Card (£${(customer?.giftCardBalance || 0).toFixed(2)})`}
                        </button>
                    )}
                    <button onClick={onLinkCustomer} className={`w-full py-3 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${customer ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-[#161625] border border-white/10 text-white/70 hover:text-white hover:brightness-110'}`}>
                        <Icon name={customer ? 'edit' : 'link'} className="w-5 h-5"/> {customer ? `Linked: ${customer.name} (${customer.totalLoyaltyPoints.toLocaleString()} pts)` : 'Link Customer'}
                    </button>
               </div>
              
              <button
                onClick={handleChargeClick}
                disabled={!payment.isSaleCompletable}
                className="w-full mt-4 bg-emerald-600 text-white font-black italic uppercase tracking-tight py-5 rounded-2xl text-xl shadow-xl shadow-emerald-600/30 hover:brightness-110 transition-all active:scale-95 disabled:bg-white/10 disabled:text-white/30 disabled:shadow-none disabled:cursor-not-allowed"
              >
                  Charge
              </button>
          </div>
        </div>
      </aside>

      <ItemNoteModal isOpen={itemNoteState.isOpen} onClose={() => setItemNoteState({ isOpen: false, forItemInstanceId: null })} onSave={handleSaveNote} initialNote={itemNoteState.initialNote}/>
    </>
  );
}