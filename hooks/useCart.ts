
import { useState, useMemo, useCallback, useEffect } from 'react';
import { CartItem, OrderType, PaymentMethod, Product, OpenTab, Table, Customer } from '../types';
import { calculateVatAmount, getEffectiveVatRate } from '../utils/vat';
import { SyncManager } from '../utils/syncManager';

/**
 * A robust sanitizer that takes a potentially incomplete item and returns a valid CartItem.
 * This is the core fix to prevent "corrupt data" from older app versions or incomplete
 * imports from entering the cart and causing downstream crashes. It ensures every
 * property has a safe, default value.
 */
const sanitizeCartItem = (item: Partial<Product> & Partial<CartItem>): CartItem => {
    const sanitized: CartItem = {
        // Product fields with defaults
        id: item.id || `custom-${crypto.randomUUID()}`,
        name: item.name || 'Unnamed Item',
        priceEatIn: typeof item.priceEatIn === 'number' ? item.priceEatIn : 0,
        priceTakeAway: typeof item.priceTakeAway === 'number' ? item.priceTakeAway : 0,
        vatRateEatIn: typeof item.vatRateEatIn === 'number' ? item.vatRateEatIn : 20,
        vatRateTakeAway: typeof item.vatRateTakeAway === 'number' ? item.vatRateTakeAway : 20,
        category: item.category || 'Uncategorized',
        loyaltyPoints: typeof item.loyaltyPoints === 'number' ? item.loyaltyPoints : undefined,
        pointsToRedeem: typeof item.pointsToRedeem === 'number' ? item.pointsToRedeem : undefined,
        isGiftCard: item.isGiftCard ?? false,
        isRedeemable: item.isRedeemable ?? false,

        // CartItem fields with defaults
        instanceId: item.instanceId || `cart-item-${crypto.randomUUID()}`,
        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
        notes: item.notes,
        isRedeemed: item.isRedeemed ?? false,
        linkedItems: (item.linkedItems || []).map(sanitizeCartItem), // Recursively sanitize linked items
    };
    return sanitized;
};


export function useCart(
    syncedOpenTabs: OpenTab[], 
    syncManager: SyncManager | null,
    staffInfo: { staffId: string, staffName: string } | null,
    customers: Customer[]
) {
  const createDefaultOrder = useCallback((): OpenTab => ({
    id: `walk-in-${crypto.randomUUID()}`, // Transient ID
    tableId: '',
    tableName: 'Walk-in',
    cart: [],
    orderType: OrderType.TakeAway,
    discount: '',
    paymentMethod: PaymentMethod.Card,
    cashTendered: '',
    createdAt: new Date().toISOString(),
    staffId: staffInfo?.staffId ?? '', 
    staffName: staffInfo?.staffName ?? '',
    customerId: '',
  }), [staffInfo]);

  const [currentOrder, setCurrentOrder] = useState<OpenTab>(createDefaultOrder());
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [requiresTableService, setRequiresTableService] = useState(false);
  const [isGiftCardPaymentActive, setIsGiftCardPaymentActive] = useState(false);
  
  const linkedCustomer = useMemo(() => {
    const customerId = currentOrder.customerId;
    if (!customerId || !customers) return undefined;
    return customers.find(c => c.id === customerId);
  }, [currentOrder.customerId, customers]);

  // Effect to update staff info in the default order when it becomes available
  useEffect(() => {
    if (staffInfo && !activeTableId) { // Only update the default walk-in
      setCurrentOrder(prev => ({...prev, staffId: staffInfo.staffId, staffName: staffInfo.staffName }));
    }
  }, [staffInfo, activeTableId]);
  
  // Effect to automatically deactivate gift card payment if customer changes or cart becomes empty
  useEffect(() => {
    if (!linkedCustomer || currentOrder.cart.length === 0) {
      setIsGiftCardPaymentActive(false);
    }
  }, [linkedCustomer, currentOrder.cart]);

  const updateCurrentOrder = useCallback((updates: Partial<OpenTab> | ((prevOrder: OpenTab) => Partial<OpenTab>), isInternal: boolean = false) => {
    setCurrentOrder(prev => {
        const newUpdates = typeof updates === 'function' ? updates(prev) : updates;
        const newOrder = { ...prev, ...newUpdates };
        if (activeTableId && syncManager && !isInternal) {
            // Sanitize cart before syncing to prevent sending bad data upstream
            const sanitizedUpdates = newUpdates.cart ? { ...newUpdates, cart: newUpdates.cart.map(sanitizeCartItem) } : newUpdates;
            syncManager.patchItem('openTabs', activeTableId, sanitizedUpdates);
        }
        return newOrder;
    });
  }, [activeTableId, syncManager]);


  const handleAddToCart = useCallback((product: Product) => {
    let newCart = [...currentOrder.cart];
    // Don't stack items with notes or linked items or redeemed items.
    const existingItemIndex = newCart.findIndex(item => item.id === product.id && !item.notes && !item.linkedItems?.length && !item.isRedeemed);

    if (existingItemIndex > -1) {
      newCart[existingItemIndex].quantity += 1;
    } else {
      newCart.push(sanitizeCartItem(product)); // Sanitize new product on entry
    }
    updateCurrentOrder({ cart: newCart });
  }, [currentOrder.cart, updateCurrentOrder]);

  const addMultipleItemsToCart = useCallback((items: { product: Product, quantity: number }[]) => {
      updateCurrentOrder(prevOrder => {
          let newCart = [...prevOrder.cart];
          items.forEach(({ product, quantity }) => {
              // Find if a stackable instance of this product already exists
              const existingItemIndex = newCart.findIndex(cartItem => cartItem.id === product.id && !cartItem.notes && !cartItem.linkedItems?.length && !cartItem.isRedeemed);
              
              if (existingItemIndex > -1) {
                  // Update quantity of existing stack
                  const existingItem = newCart[existingItemIndex];
                  newCart[existingItemIndex] = {
                      ...existingItem,
                      quantity: existingItem.quantity + quantity,
                  };
              } else {
                  // Add as a new line item with the full quantity
                  newCart.push(sanitizeCartItem({ ...product, quantity }));
              }
          });
          return { cart: newCart };
      });
  }, [updateCurrentOrder]);

  const addComplexItemsToCart = useCallback((items: { product: Product, quantity: number, note?: string, extras: { product: Product, quantity: number }[] }[]) => {
    updateCurrentOrder(prevOrder => {
        const newCart = [...prevOrder.cart];
        items.forEach(complexItem => {
            const linkedCartItems: CartItem[] = [];
            complexItem.extras.forEach(extra => {
                // Handle quantity of extras by adding multiple instances
                for (let i = 0; i < extra.quantity; i++) {
                    linkedCartItems.push(sanitizeCartItem(extra.product));
                }
            });

            const mainCartItem = sanitizeCartItem({
                ...complexItem.product,
                quantity: complexItem.quantity,
                notes: complexItem.note,
                linkedItems: linkedCartItems,
            });

            newCart.push(mainCartItem);
        });
        return { cart: newCart };
    });
  }, [updateCurrentOrder]);

  const addCustomItemsToCart = useCallback((items: { name: string, price: number, quantity: number }[]) => {
    if (!items || items.length === 0) return;

    const newCartItems: CartItem[] = items.map(item => sanitizeCartItem({
        id: `custom-${crypto.randomUUID()}`,
        name: item.name,
        priceEatIn: item.price,
        priceTakeAway: item.price,
        vatRateEatIn: 20, // Default VAT
        vatRateTakeAway: 20, // Default VAT
        category: 'Custom',
        quantity: item.quantity,
        isRedeemable: false,
    }));

    updateCurrentOrder(prev => ({ cart: [...(prev.cart || []), ...newCartItems] }));
  }, [updateCurrentOrder]);

  const addGiftCardToCart = useCallback((amount: number) => {
    const giftCardItem: CartItem = {
      id: `giftcard-${amount.toFixed(2)}`,
      instanceId: `cart-item-${crypto.randomUUID()}`,
      name: `Gift Card - £${amount.toFixed(2)}`,
      priceEatIn: amount,
      priceTakeAway: amount,
      vatRateEatIn: 0,
      vatRateTakeAway: 0,
      category: 'GIFT_CARD_PURCHASE',
      quantity: 1,
      isGiftCard: true,
      isRedeemable: false,
    };
    const newCart = [giftCardItem]; // Gift card purchase clears other items
    updateCurrentOrder({ cart: newCart });
  }, [updateCurrentOrder]);


  const handleQuantityChange = useCallback((instanceId: string, newQuantity: number) => {
    let newCart = [...currentOrder.cart];
    if (newQuantity <= 0) {
      newCart = newCart.filter(item => item.instanceId !== instanceId);
    } else {
      const itemIndex = newCart.findIndex(item => item.instanceId === instanceId);
      if (itemIndex > -1) {
        newCart[itemIndex].quantity = newQuantity;
      }
    }
    updateCurrentOrder({ cart: newCart });
  }, [currentOrder.cart, updateCurrentOrder]);

  const handleRemoveFromCart = useCallback((instanceId: string) => {
    const newCart = currentOrder.cart.filter(item => item.instanceId !== instanceId);
    updateCurrentOrder({ cart: newCart });
  }, [currentOrder.cart, updateCurrentOrder]);

  const pointsSpentInCart = useMemo(() => {
    return (currentOrder.cart || []).reduce((acc, item) => {
        if (item.isRedeemed && item.pointsToRedeem) {
            return acc + (item.pointsToRedeem * (item.quantity || 1));
        }
        return acc;
    }, 0);
  }, [currentOrder.cart]);

  const availablePointsForRedemption = useMemo(() => {
      const totalPoints = linkedCustomer?.totalLoyaltyPoints ?? 0;
      return totalPoints - pointsSpentInCart;
  }, [linkedCustomer, pointsSpentInCart]);


  const redeemItem = useCallback((instanceId: string) => {
    const cart = currentOrder.cart;
    const itemToRedeem = cart.find(i => i.instanceId === instanceId);
    if (!itemToRedeem || !itemToRedeem.pointsToRedeem) return;

    if (itemToRedeem.pointsToRedeem > availablePointsForRedemption) {
        console.warn("Attempted to redeem with insufficient points.");
        return; // Do nothing
    }

    let newCart = [...cart];
    if (itemToRedeem.quantity > 1) {
      // Split the item
      const originalItemIndex = newCart.findIndex(i => i.instanceId === instanceId);
      newCart[originalItemIndex] = { ...itemToRedeem, quantity: itemToRedeem.quantity - 1 };
      
      const redeemedItem = sanitizeCartItem({ ...itemToRedeem, quantity: 1, isRedeemed: true, instanceId: `cart-item-${crypto.randomUUID()}` });
      newCart.push(redeemedItem);
    } else {
      // Just mark the single item as redeemed
      newCart = newCart.map(item => item.instanceId === instanceId ? { ...item, isRedeemed: true } : item);
    }
    updateCurrentOrder({ cart: newCart });
  }, [currentOrder.cart, updateCurrentOrder, availablePointsForRedemption]);

  const unRedeemItem = useCallback((instanceId: string) => {
    const cart = currentOrder.cart;
    const itemToUnRedeem = cart.find(i => i.instanceId === instanceId);
    if (!itemToUnRedeem) return;
    
    let newCart = [...cart];

    // Find a matching, non-redeemed item to merge with
    const mergeTargetIndex = newCart.findIndex(i => i.id === itemToUnRedeem.id && !i.isRedeemed && !i.notes && !i.linkedItems?.length);
    
    if (mergeTargetIndex > -1) {
        // Merge with existing item
        const itemToUnRedeemIndex = newCart.findIndex(i => i.instanceId === instanceId);
        if (itemToUnRedeemIndex > -1) { // Check if it exists before splicing
          newCart[mergeTargetIndex] = { ...newCart[mergeTargetIndex], quantity: newCart[mergeTargetIndex].quantity + 1 };
          newCart.splice(itemToUnRedeemIndex, 1);
        }
    } else {
        // No item to merge with, so just un-flag it
        newCart = newCart.map(item => item.instanceId === instanceId ? { ...item, isRedeemed: false } : item);
    }

    updateCurrentOrder({ cart: newCart });
  }, [currentOrder.cart, updateCurrentOrder]);

  const clearCart = useCallback(() => {
    if (activeTableId && syncManager) {
        syncManager.deleteItem('openTabs', activeTableId);
    }
    setCurrentOrder(createDefaultOrder());
    setActiveTableId(null);
    setRequiresTableService(false);
  }, [activeTableId, syncManager, createDefaultOrder]);

  const deleteTab = useCallback((tableId: string) => {
    if (syncManager) {
        syncManager.deleteItem('openTabs', tableId);
        // If we are deleting the currently active tab, we should also reset the local state.
        if (activeTableId === tableId) {
            setCurrentOrder(createDefaultOrder());
            setActiveTableId(null);
            setRequiresTableService(false);
        }
    }
  }, [syncManager, activeTableId, createDefaultOrder]);

  const detachFromTabAndStartNewOrder = useCallback(() => {
    // Don't delete the tab, just reset the local state.
    setCurrentOrder(createDefaultOrder());
    setActiveTableId(null);
    setRequiresTableService(false);
  }, [createDefaultOrder]);

  const totals = useMemo(() => {
    let grossTotal = 0;
    let totalVat = 0;

    for (const item of currentOrder.cart || []) {
        if (!item || typeof item !== 'object') continue;

        if (item.isRedeemed) continue;

        const price = currentOrder.orderType === OrderType.EatIn ? item.priceEatIn : item.priceTakeAway;
        let itemPrice = (typeof price === 'number' && isFinite(price)) ? price : 0;
        let itemVatBasePrice = itemPrice; // Base price for VAT is just the main item

        if (Array.isArray(item.linkedItems)) {
            for (const extra of item.linkedItems) {
                if (!extra || typeof extra !== 'object') continue;
                const extraPriceVal = currentOrder.orderType === OrderType.EatIn ? extra.priceEatIn : extra.priceTakeAway;
                const validExtraPrice = (typeof extraPriceVal === 'number' && isFinite(extraPriceVal)) ? extraPriceVal : 0;
                itemPrice += validExtraPrice;
            }
        }
        
        const quantity = (typeof item.quantity === 'number' && isFinite(item.quantity) && item.quantity > 0) ? item.quantity : 1;
        grossTotal += itemPrice * quantity;
        
        let mainVat = calculateVatAmount(itemVatBasePrice, getEffectiveVatRate(item, currentOrder.orderType));
        let linkedVat = 0;

        if (Array.isArray(item.linkedItems)) {
             for (const extra of item.linkedItems) {
                if (!extra || typeof extra !== 'object') continue;
                const extraPriceVal = currentOrder.orderType === OrderType.EatIn ? extra.priceEatIn : extra.priceTakeAway;
                const extraPrice = (typeof extraPriceVal === 'number' && isFinite(extraPriceVal)) ? extraPriceVal : 0;
                linkedVat += calculateVatAmount(extraPrice, getEffectiveVatRate(extra, currentOrder.orderType));
            }
        }
        
        totalVat += (mainVat + linkedVat) * quantity;
    }

    const discountVal = parseFloat(currentOrder.discount);
    const discountPercent = !isNaN(discountVal) ? Math.max(0, Math.min(100, discountVal)) : 0;
    const discountAmount = (grossTotal * discountPercent) / 100;
    const finalTotal = Math.max(0, grossTotal - discountAmount);

    return { grossTotal, totalVat, discountAmount, finalTotal };
  }, [currentOrder.cart, currentOrder.orderType, currentOrder.discount]);
  
  const giftCardAmountApplied = useMemo(() => {
    if (!isGiftCardPaymentActive || !linkedCustomer || !linkedCustomer.giftCardBalance) {
      return 0;
    }
    // Apply the smaller of the balance or the total due
    return Math.min(linkedCustomer.giftCardBalance, totals.finalTotal);
  }, [isGiftCardPaymentActive, linkedCustomer, totals.finalTotal]);

  const remainingTotal = useMemo(() => {
    return totals.finalTotal - giftCardAmountApplied;
  }, [totals.finalTotal, giftCardAmountApplied]);

  const payment = useMemo(() => {
    const cashTenderedNum = parseFloat(currentOrder.cashTendered);
    let changeDue = null;
    let tenderedError = null;
    let isSaleCompletable = currentOrder.cart.length > 0;
    
    if (currentOrder.paymentMethod === PaymentMethod.Cash && !isGiftCardPaymentActive) {
        if (currentOrder.cashTendered !== '' && (isNaN(cashTenderedNum) || cashTenderedNum < remainingTotal)) {
            tenderedError = 'Amount must be >= total.';
            isSaleCompletable = false;
        } else if (currentOrder.cashTendered !== '' && !tenderedError) {
            changeDue = cashTenderedNum - remainingTotal;
        } else if (currentOrder.cashTendered === '' && remainingTotal > 0) {
            isSaleCompletable = false;
        }
    } else if (isGiftCardPaymentActive && remainingTotal > 0 && currentOrder.paymentMethod === PaymentMethod.Cash) {
        if (currentOrder.cashTendered !== '' && (isNaN(cashTenderedNum) || cashTenderedNum < remainingTotal)) {
            tenderedError = 'Amount must be >= remaining total.';
            isSaleCompletable = false;
        } else if (currentOrder.cashTendered !== '' && !tenderedError) {
            changeDue = cashTenderedNum - remainingTotal;
        } else if (currentOrder.cashTendered === '' && remainingTotal > 0) {
            isSaleCompletable = false;
        }
    }
    
    return { changeDue, tenderedError, isSaleCompletable };
  }, [currentOrder.cashTendered, currentOrder.paymentMethod, currentOrder.cart.length, remainingTotal, isGiftCardPaymentActive]);

  const loadTab = useCallback((tableId: string) => {
    const tabToLoad = syncedOpenTabs.find(t => t.id === tableId);
    if (tabToLoad) {
        // Sanitize the entire cart when loading a tab
        const sanitizedCart = (tabToLoad.cart || []).map(sanitizeCartItem);
        setCurrentOrder({ ...tabToLoad, cart: sanitizedCart });
        setActiveTableId(tableId);
        setRequiresTableService(false);
    }
  }, [syncedOpenTabs]);
  
  const createEmptyTab = useCallback((table: Table) => {
    if (!syncManager || !staffInfo) return;
    const newTab: OpenTab = {
        id: table.id,
        tableId: table.id,
        tableName: table.name,
        cart: [],
        orderType: OrderType.EatIn,
        discount: '',
        paymentMethod: PaymentMethod.Card,
        cashTendered: '',
        createdAt: new Date().toISOString(),
        staffId: staffInfo.staffId,
        staffName: staffInfo.staffName,
        customerId: '',
    };
    syncManager.saveItem('openTabs', newTab);
    // Directly set state
    setCurrentOrder(newTab);
    setActiveTableId(table.id);
    setRequiresTableService(false);
  }, [syncManager, staffInfo]);

  const openTab = useCallback((table: Table) => {
      if (!syncManager || !staffInfo) return;
      // Sanitize the current cart before saving it to a new tab
      const sanitizedCart = (currentOrder.cart || []).map(sanitizeCartItem);
      const newTab: OpenTab = { 
          ...currentOrder, 
          cart: sanitizedCart, 
          id: table.id, 
          tableId: table.id, 
          tableName: table.name, 
          orderType: OrderType.EatIn, 
          createdAt: new Date().toISOString(),
          // Ensure staff info is on the new tab
          staffId: staffInfo.staffId,
          staffName: staffInfo.staffName
      };
      // Save the complete tab object to sync manager
      syncManager.saveItem('openTabs', newTab);
      
      // Now, directly update the local state to reflect this new tab being active
      setCurrentOrder(newTab);
      setActiveTableId(table.id);
      setRequiresTableService(false);
  }, [currentOrder, syncManager, staffInfo]);

  const getSaleData = useCallback(() => ({
    totals: { ...totals, remainingTotal },
    cart: currentOrder.cart,
    orderType: currentOrder.orderType,
    paymentMethod: currentOrder.paymentMethod,
    discount: totals.discountAmount,
    tableName: currentOrder.tableName,
    customerId: currentOrder.customerId,
    giftCardAmountApplied
  }), [totals, remainingTotal, currentOrder, giftCardAmountApplied]);


  const updateItemNote = useCallback((instanceId: string, note: string) => {
      const newCart = currentOrder.cart.map(item => item.instanceId === instanceId ? { ...item, notes: note } : item);
      updateCurrentOrder({ cart: newCart });
  }, [currentOrder.cart, updateCurrentOrder]);

  const addExtraToItem = useCallback((mainItemInstanceId: string, extraProduct: Product) => {
      const extraAsCartItem = sanitizeCartItem(extraProduct); // Sanitize the extra
      const newCart = currentOrder.cart.map(item => {
          if (item.instanceId === mainItemInstanceId) {
              const linkedItems = [...(item.linkedItems || []), extraAsCartItem];
              return { ...item, linkedItems };
          }
          return item;
      });
      updateCurrentOrder({ cart: newCart });
  }, [currentOrder.cart, updateCurrentOrder]);

  const removeExtraFromItem = useCallback((mainItemInstanceId: string, extraInstanceId: string) => {
      const newCart = currentOrder.cart.map(item => {
          if (item.instanceId === mainItemInstanceId) {
              const linkedItems = (item.linkedItems || []).filter(extra => extra.instanceId !== extraInstanceId);
              return { ...item, linkedItems };
          }
          return item;
      });
      updateCurrentOrder({ cart: newCart });
  }, [currentOrder.cart, updateCurrentOrder]);


  return {
    ...currentOrder,
    setOrderType: (val: OrderType) => updateCurrentOrder({ orderType: val }),
    setPaymentMethod: (val: PaymentMethod) => {
        setIsGiftCardPaymentActive(false); // Deactivate gift card if another method is chosen
        updateCurrentOrder({ paymentMethod: val });
    },
    setCashTendered: (val: string) => updateCurrentOrder({ cashTendered: val }),
    setDiscount: (val: string) => updateCurrentOrder({ discount: val }),
    setCustomerId: (val: string) => updateCurrentOrder({ customerId: val }),
    
    isTabActive: !!activeTableId,
    activeTableId,
    requiresTableService,
    setRequiresTableService,
    
    handleAddToCart,
    addMultipleItemsToCart,
    addComplexItemsToCart,
    addCustomItemsToCart,
    addGiftCardToCart,
    handleQuantityChange,
    handleRemoveFromCart,
    
    redeemItem,
    unRedeemItem,
    availablePointsForRedemption,

    clearCart,
    deleteTab,
    detachFromTabAndStartNewOrder,
    totals: { ...totals, remainingTotal }, // Add remainingTotal to exported totals
    payment,
    getSaleData,

    updateItemNote,
    addExtraToItem,
    removeExtraFromItem,

    loadTab,
    createEmptyTab,
    openTab,
    
    // Gift card payment controls
    isGiftCardPaymentActive,
    giftCardAmountApplied,
    applyGiftCardBalance: useCallback(() => setIsGiftCardPaymentActive(true), []),
    removeGiftCardBalance: useCallback(() => setIsGiftCardPaymentActive(false), []),
  };
}
