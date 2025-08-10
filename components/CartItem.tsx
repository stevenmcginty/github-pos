


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
    <div className={`py-3 border-b border-border-color/50 ${item.isRedeemed ? 'bg-green-500/10' : ''}`}>
        <div className="flex items-start justify-between">
            <div className="flex-grow">
                <p className="font-semibold text-text-primary">{item.name}</p>
                {item.notes && <p className="text-sm text-blue-400 italic pl-2 mt-1">↳ {item.notes}</p>}
                <p className="text-sm text-text-secondary mt-1">£{currentPrice.toFixed(2)} each</p>
                {item.isRedeemed && (
                    <div className="text-xs font-bold text-green-400 pl-2 mt-1 flex items-center gap-1">
                        <Icon name="star" className="w-3 h-3" />
                        <span>REDEEMED with { (item.pointsToRedeem || 0) } points</span>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4 ml-4">
                <div className="flex items-center gap-1.5">
                    {item.isRedeemed ? (
                        <button onClick={() => { triggerHapticFeedback(); unRedeemItem(item.instanceId); }} className="bg-red-500/20 p-1.5 rounded-md hover:bg-red-500/40" title="Undo Redemption">
                            <Icon name="xCircle" className="w-5 h-5 text-red-400" />
                        </button>
                    ) : item.isRedeemable && item.pointsToRedeem && customer ? (
                        <button 
                            onClick={() => { triggerHapticFeedback(); redeemItem(item.instanceId); }} 
                            disabled={!canRedeem}
                            className="bg-green-500/20 p-1.5 rounded-md hover:bg-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed" 
                            title={canRedeem ? `Redeem for ${item.pointsToRedeem} points` : `Not enough points (${availablePoints} / ${item.pointsToRedeem})`}
                        >
                            <Icon name="star" className="w-5 h-5 text-green-400" />
                        </button>
                    ) : (
                         <button onClick={() => { triggerHapticFeedback(); onAddExtraRequest(); }} className="bg-white/5 p-1.5 rounded-md hover:bg-white/10" title="Add Extra" disabled={item.isRedeemed}>
                            <Icon name="link" className={`w-4 h-4 ${item.isRedeemed ? 'text-cyan-400/50' : 'text-cyan-400'}`}/>
                        </button>
                    )}
                    <button onClick={() => { triggerHapticFeedback(); onAddNote(item.instanceId, item.notes); }} className="bg-white/5 p-1.5 rounded-md hover:bg-white/10" title={item.notes ? "Edit Note" : "Add Note"}>
                        <Icon name="edit" className="w-4 h-4 text-blue-400"/>
                    </button>
                    <button onClick={() => { triggerHapticFeedback(); onRemove(item.instanceId); }} className="bg-white/5 p-1.5 rounded-md hover:bg-white/10" title="Remove Item">
                        <Icon name="trash" className="w-4 h-4 text-red-500"/>
                    </button>
                </div>
                <div className="flex items-center border border-text-secondary/50 rounded-md">
                    <button onClick={handleDecrease} className="px-2 py-1 text-text-secondary hover:bg-bg-panel rounded-l-md" disabled={item.isRedeemed}>-</button>
                    <span className="px-3 py-1 font-bold text-text-primary">{item.quantity}</span>
                    <button onClick={handleIncrease} className="px-2 py-1 text-text-secondary hover:bg-bg-panel rounded-r-md" disabled={item.isRedeemed}>+</button>
                </div>
                <p className="w-20 text-right font-bold text-lg text-text-primary">
                    {item.isRedeemed ? (
                        <span className="text-green-400">FREE</span>
                    ) : (
                        `£${((currentPrice + totalLinkedPrice) * item.quantity).toFixed(2)}`
                    )}
                </p>
            </div>
        </div>
        {item.linkedItems && item.linkedItems.length > 0 && (
            <div className="pl-2 mt-1 space-y-1">
                {item.linkedItems.map(extra => {
                    const extraPrice = orderType === OrderType.EatIn ? extra.priceEatIn : extra.priceTakeAway;
                    return (
                        <div key={extra.instanceId} className="flex items-center justify-between text-sm">
                             <p className="text-green-400 italic">↳ {extra.name}</p>
                            <div className="flex items-center gap-2">
                                <span className="text-green-400 italic">+ £{extraPrice.toFixed(2)}</span>
                                <button onClick={() => { triggerHapticFeedback(); onRemoveExtra(item.instanceId, extra.instanceId); }} className="text-red-500 hover:text-red-700 p-0.5" title="Remove Extra" disabled={item.isRedeemed}>
                                    <Icon name="close" className="w-4 h-4"/>
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