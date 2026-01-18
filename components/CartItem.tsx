


import React from 'react';
import { CartItem as CartItemType, OrderType, Customer } from '../types';
import Icon from './Icon';
import { triggerHapticFeedback } from '../utils/haptics';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (instanceId: string, newQuantity: number) => void;
  onRemove: (instanceId: string) => void;
  onAddNote: (instanceId: string, initialNote?: string) => void;
  onAddExtraRequest: () => void;
  onRemoveExtra: (mainItemInstanceId: string, extraInstanceId: string) => void;
  orderType: OrderType;
  customer: Customer | undefined;
  availablePoints: number;
  redeemItem: (instanceId: string) => void;
  unRedeemItem: (instanceId: string) => void;
}

const CartItem = ({ item, onQuantityChange, onRemove, onAddNote, onAddExtraRequest, onRemoveExtra, orderType, customer, availablePoints, redeemItem, unRedeemItem }: CartItemProps) => {
  const handleIncrease = () => {
    triggerHapticFeedback();
    onQuantityChange(item.instanceId, item.quantity + 1);
  };

  const handleDecrease = () => {
    triggerHapticFeedback();
    onQuantityChange(item.instanceId, item.quantity - 1);
  };

  const currentPrice = (orderType === OrderType.EatIn ? item.priceEatIn : item.priceTakeAway) ?? 0;
  let totalLinkedPrice = 0;
  if(item.linkedItems) {
      totalLinkedPrice = item.linkedItems.reduce((acc, extra) => acc + (orderType === OrderType.EatIn ? extra.priceEatIn : extra.priceTakeAway), 0);
  }

  const canRedeem = customer && item.isRedeemable && item.pointsToRedeem && availablePoints >= item.pointsToRedeem;

  return (
    <div className={`py-3 px-3 my-1 rounded-xl border border-white/10 bg-[#161625] ${item.isRedeemed ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}>
        <div className="flex items-start justify-between">
            <div className="flex-grow">
                <p className="font-black uppercase tracking-tight text-white">{item.name}</p>
                {item.notes && <p className="text-sm text-blue-400 italic pl-2 mt-1">↳ {item.notes}</p>}
                <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mt-1">£{currentPrice.toFixed(2)} each</p>
                {item.isRedeemed && (
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 pl-2 mt-1 flex items-center gap-1">
                        <Icon name="star" className="w-3 h-3" />
                        <span>Redeemed with { (item.pointsToRedeem || 0) } pts</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3 ml-4">
                <div className="flex items-center gap-1">
                    {item.isRedeemed ? (
                        <button onClick={() => { triggerHapticFeedback(); unRedeemItem(item.instanceId); }} className="bg-red-500/20 p-2 rounded-lg hover:bg-red-500/40 transition-all active:scale-95" title="Undo Redemption">
                            <Icon name="xCircle" className="w-4 h-4 text-red-400" />
                        </button>
                    ) : item.isRedeemable && item.pointsToRedeem && customer ? (
                        <button
                            onClick={() => { triggerHapticFeedback(); redeemItem(item.instanceId); }}
                            disabled={!canRedeem}
                            className="bg-emerald-500/20 p-2 rounded-lg hover:bg-emerald-500/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={canRedeem ? `Redeem for ${item.pointsToRedeem} points` : `Not enough points (${availablePoints} / ${item.pointsToRedeem})`}
                        >
                            <Icon name="star" className="w-4 h-4 text-emerald-400" />
                        </button>
                    ) : (
                         <button onClick={() => { triggerHapticFeedback(); onAddExtraRequest(); }} className="bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-all active:scale-95" title="Add Extra" disabled={item.isRedeemed}>
                            <Icon name="link" className={`w-4 h-4 ${item.isRedeemed ? 'text-cyan-400/50' : 'text-cyan-400'}`}/>
                        </button>
                    )}
                    <button onClick={() => { triggerHapticFeedback(); onAddNote(item.instanceId, item.notes); }} className="bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-all active:scale-95" title={item.notes ? "Edit Note" : "Add Note"}>
                        <Icon name="edit" className="w-4 h-4 text-blue-400"/>
                    </button>
                    <button onClick={() => { triggerHapticFeedback(); onRemove(item.instanceId); }} className="bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-all active:scale-95" title="Remove Item">
                        <Icon name="trash" className="w-4 h-4 text-red-400"/>
                    </button>
                </div>
                <div className="flex items-center bg-[#13131d] border border-white/10 rounded-xl overflow-hidden">
                    <button onClick={handleDecrease} className="px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95 font-black" disabled={item.isRedeemed}>-</button>
                    <span className="px-3 py-2 font-mono font-black text-white min-w-[2.5rem] text-center">{item.quantity}</span>
                    <button onClick={handleIncrease} className="px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 transition-all active:scale-95 font-black" disabled={item.isRedeemed}>+</button>
                </div>
                <p className="w-20 text-right font-mono font-black text-lg text-white">
                    {item.isRedeemed ? (
                        <span className="text-emerald-400">FREE</span>
                    ) : (
                        `£${((currentPrice + totalLinkedPrice) * item.quantity).toFixed(2)}`
                    )}
                </p>
            </div>
        </div>
        {item.linkedItems && item.linkedItems.length > 0 && (
            <div className="pl-3 mt-2 pt-2 border-t border-white/5 space-y-1">
                {item.linkedItems.map(extra => {
                    const extraPrice = orderType === OrderType.EatIn ? extra.priceEatIn : extra.priceTakeAway;
                    return (
                        <div key={extra.instanceId} className="flex items-center justify-between text-sm">
                             <p className="text-teal-400 font-medium">↳ {extra.name}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-teal-400 font-mono font-bold">+ £{extraPrice.toFixed(2)}</span>
                                <button onClick={() => { triggerHapticFeedback(); onRemoveExtra(item.instanceId, extra.instanceId); }} className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-500/20 transition-all active:scale-95" title="Remove Extra" disabled={item.isRedeemed}>
                                    <Icon name="close" className="w-3 h-3"/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};

export default CartItem;