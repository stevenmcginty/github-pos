
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Sale, SaleItem, CartItem, Product, Customer, PaymentMethod, OrderType, PointTransaction, UnclaimedGiftCard, OpenTab } from '../types';
import { dbError } from '../firebase';
import { shareReceipt } from '../utils/receipts';
import { calculateAvailablePoints } from '../utils/loyalty';

// --- Hooks ---
import { useAuth } from '../hooks/useAuth';
import { useSyncManagerData } from '../hooks/useSyncManagerData';
import { useCart } from '../hooks/useCart';
import { useModalState } from '../hooks/useModalState';
import { useTheme } from '../hooks/useTheme';

// --- Components ---
import { MainView } from './MainView';
import OrderPanel from './OrderPanel';
import NavMenu from './SalesModal';
import Icon from './Icon';

// --- Modals ---
import ProductModal from './ProductModal';
import AnalyticsDashboardModal, { type View } from './AnalyticsDashboardModal';
import ReceiptModal from './ReceiptModal';
import EmailReceiptModal from './EmailReceiptModal';
import PrintReceipt from './PrintReceipt';
import ConfirmSaleModal from './ConfirmSaleModal';
import CustomItemModal from './CustomItemModal';
import TablePlanModal from './TablePlanModal';
import PrintBillModal from './PrintBillModal';
import QRCodeScannerModal from './QRCodeScannerModal';
import CustomerHistoryModal from './CustomerHistoryModal';
import ExtrasSelectionModal from './ExtrasSelectionModal';
import CustomGiftCardModal from './CustomGiftCardModal';
import ShareableGiftCardModal from './ShareableGiftCardModal';
import PostSaleGiftCardChoiceModal from './PostSaleGiftCardChoiceModal';
import CustomerModal from './CustomerModal';


const LoginScreen = ({ onSignIn, error }: { onSignIn: (email: string, pass:string) => Promise<void>; error: string | null; }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSignIn(email, password);
        } catch (err) {
            // error is handled by the useAuth hook and passed in as a prop
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col justify-center items-center p-8 bg-bg-main text-text-primary">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-text-primary">Cafe Roma POS</h1>
                <p className="text-text-secondary">Please sign in to continue</p>
            </div>
            <div className="w-full max-w-sm bg-bg-panel p-8 rounded-2xl shadow-2xl">
                <h3 className="text-2xl font-bold text-accent mb-2 flex items-center gap-2">
                    <Icon name="lock" className="w-6 h-6" />
                    Administrator Sign In
                </h3>
                <p className="text-text-secondary mb-6">Enter your credentials to access the POS system.</p>
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                     {error && <p className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">{error}</p>}
                    <div>
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                    </div>
                    <div>
                        <label htmlFor="password">Password</label>
                        <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-bg-main border border-border-color rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" required />
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={loading} className="w-full bg-accent text-text-on-accent font-bold py-3 px-4 rounded-md hover:bg-accent-hover disabled:bg-gray-500">
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Helper types and functions for AI Parsing ---
type ParsedItem = { 
    productName: string; 
    quantity: number; 
    note?: string;
    extras?: { productName: string; quantity: number }[]; 
};

type ParsedCustomItem = {
    name: string;
    price: number;
    quantity: number;
};

type ParsedOrder = { 
    orderType?: OrderType; 
    tableName?: string; 
    customerName?: string; 
    items: ParsedItem[];
    customItems?: ParsedCustomItem[];
};

const normalizeForLookup = (str: string): string => {
    if (!str) return '';
    let normalized = str.normalize('NFC').toLowerCase().trim();
    if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
        return normalized.slice(0, -1);
    }
    return normalized;
};


const AppContent = () => {
  const { user, signOut } = useAuth();
  const syncDataHook = useSyncManagerData();
  const { products, sales, staff, shifts, notes, specialDays, tables, openTabs, customers, syncManager, settings } = syncDataHook;
  
  const staffInfo = useMemo(() => {
    if (user && staff) {
      const loggedInStaff = staff.find(s => s.name.toLowerCase() === user.displayName?.toLowerCase());
      return loggedInStaff ? { staffId: loggedInStaff.id, staffName: loggedInStaff.name } : { staffId: 'admin', staffName: 'Admin' };
    }
    return null;
  }, [user, staff]);
  
  const cartHook = useCart(openTabs, syncManager, staffInfo, customers);
  const modalHook = useModalState();
  const [categoryPath, setCategoryPath] = useState<string[]>([]);
  const [billToPrint, setBillToPrint] = useState<OpenTab | null>(null);
  const [dashboardInitialView, setDashboardInitialView] = useState<View | undefined>();

  // --- Loyalty & Gift Card specific modals ---
  const [qrScannerState, setQrScannerState] = useState({ isOpen: false, callback: (data: string) => {} });
  const [customerHistoryModal, setCustomerHistoryModal] = useState<Customer | null>(null);
  const [extrasSelectionModal, setExtrasSelectionModal] = useState<{ isOpen: boolean, forItemInstanceId: string | null }>({ isOpen: false, forItemInstanceId: null });
  const [customGiftCardModalOpen, setCustomGiftCardModalOpen] = useState(false);
  const [shareableGiftCardModalState, setShareableGiftCardModalState] = useState<{ isOpen: boolean, data: any }>({ isOpen: false, data: null });
  const [postSaleGiftCardChoiceModalState, setPostSaleGiftCardChoiceModalState] = useState<{ isOpen: boolean, sale: Sale | null }>({ isOpen: false, sale: null });
  
  const handleOpenScannerForLinking = () => {
    setQrScannerState({
      isOpen: true,
      callback: (data) => cartHook.setCustomerId(data)
    });
  };

  const handleFindCustomerFromScanner = () => {
    setQrScannerState(prev => ({ ...prev, isOpen: false })); // Close scanner
    setDashboardInitialView('customers'); // Set initial view for dashboard
    modalHook.dashboard.open(); // Open dashboard
  };

  // --- Refactored Customer Save Logic ---

  // Generic save/update handler used by the dashboard
  const handleSaveCustomerGeneric = useCallback((customerData: Omit<Customer, 'id' | 'totalLoyaltyPoints' | 'giftCardBalance' | 'pointsHistory'> & { id?: string }) => {
      const customerId = customerData.id || crypto.randomUUID();
      const isNewCustomer = !customerData.id;
      const existingCustomer = isNewCustomer ? null : customers.find(c => c.id === customerId);
      const customerToSave: Customer = {
          id: customerId,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          totalLoyaltyPoints: existingCustomer?.totalLoyaltyPoints ?? 0,
          giftCardBalance: existingCustomer?.giftCardBalance ?? 0,
          pointsHistory: existingCustomer?.pointsHistory ?? [],
      };
      syncManager.saveCustomer(customerToSave);
  }, [customers, syncManager]);

  // Special handler for creating a new customer from the POS and immediately linking them to the sale
  const handleSaveAndLinkCustomer = useCallback((customerData: Omit<Customer, 'id' | 'totalLoyaltyPoints' | 'giftCardBalance' | 'pointsHistory'>) => {
      const customerId = crypto.randomUUID();
      const customerToSave: Customer = {
          id: customerId,
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          totalLoyaltyPoints: 0,
          giftCardBalance: 0,
          pointsHistory: [],
      };
      syncManager.saveCustomer(customerToSave);
      cartHook.setCustomerId(customerId); // This is the crucial step
  }, [syncManager, cartHook]);

  // State to hold the correct onSave function for the CustomerModal
  const [customerModalOnSave, setCustomerModalOnSave] = useState(() => (customerData: any) => {
      handleSaveCustomerGeneric(customerData);
      modalHook.customer.close();
  });

  // Wrapper function to open the modal for a new customer from the dashboard
  const openNewCustomerFromDashboard = useCallback(() => {
      setCustomerModalOnSave(() => (customerData: any) => {
          handleSaveCustomerGeneric(customerData);
          modalHook.customer.close();
      });
      modalHook.customer.openNew();
  }, [handleSaveCustomerGeneric, modalHook.customer]);

  // Wrapper function to open the modal for editing a customer from the dashboard
  const openEditCustomerFromDashboard = useCallback((customer: Customer) => {
      setCustomerModalOnSave(() => (customerData: any) => {
          handleSaveCustomerGeneric(customerData);
          modalHook.customer.close();
      });
      modalHook.customer.openEdit(customer);
  }, [handleSaveCustomerGeneric, modalHook.customer]);

  // Wrapper function for creating a new customer from the POS flow
  const handleCreateNewCustomerFromPOS = useCallback(() => {
      setQrScannerState(prev => ({ ...prev, isOpen: false })); // Close scanner first
      setCustomerModalOnSave(() => (customerData: any) => {
          handleSaveAndLinkCustomer(customerData);
          modalHook.customer.close(); // Close modal after saving
      });
      modalHook.customer.openNew();
  }, [handleSaveAndLinkCustomer, modalHook.customer]);


  const handleOpenExtrasModal = (forItemInstanceId: string) => {
    setExtrasSelectionModal({ isOpen: true, forItemInstanceId });
  };

  const handleSelectExtra = (extraProduct: Product) => {
    if (extrasSelectionModal.forItemInstanceId) {
        cartHook.addExtraToItem(extrasSelectionModal.forItemInstanceId, extraProduct);
    }
    setExtrasSelectionModal({ isOpen: false, forItemInstanceId: null });
  };
  
  const handleConfirmSale = () => {
    modalHook.confirmSale.close();
    
    if (!syncManager || !staffInfo) {
        alert("Sync manager or staff info not available. Cannot complete sale.");
        return;
    }
    
    const { totals, cart, orderType, paymentMethod, discount, tableName, customerId, giftCardAmountApplied } = cartHook.getSaleData();
    const finalCart = cart.filter(item => item.quantity > 0);

    const convertCartItemsToSaleItems = (items: CartItem[], currentOrderType: OrderType): SaleItem[] => {
        return items.map(cartItem => {
            const saleItem: SaleItem = {
                id: cartItem.id, name: cartItem.name, priceEatIn: cartItem.priceEatIn, priceTakeAway: cartItem.priceTakeAway,
                vatRateEatIn: cartItem.vatRateEatIn, vatRateTakeAway: cartItem.vatRateTakeAway, category: cartItem.category,
                quantity: cartItem.quantity, priceAtSale: currentOrderType === OrderType.EatIn ? cartItem.priceEatIn : cartItem.priceTakeAway,
                notes: cartItem.notes, loyaltyPoints: cartItem.loyaltyPoints, pointsToRedeem: cartItem.pointsToRedeem,
                isGiftCard: cartItem.isGiftCard, isRedeemable: cartItem.isRedeemable, isRedeemed: cartItem.isRedeemed,
                linkedItems: cartItem.linkedItems ? convertCartItemsToSaleItems(cartItem.linkedItems, currentOrderType) : undefined,
            };
            return saleItem;
        });
    };

    const saleItems: SaleItem[] = convertCartItemsToSaleItems(finalCart, orderType);

    let pointsEarned = 0;
    let pointsSpent = 0;
    
    finalCart.forEach(item => {
        if (item.isRedeemed) {
            pointsSpent += (item.pointsToRedeem || 0) * item.quantity;
        } else if (!item.isGiftCard) {
            pointsEarned += (item.loyaltyPoints || 0) * item.quantity;
        }
    });

    const sale: Sale = {
        id: crypto.randomUUID(), date: new Date().toISOString(), items: saleItems, total: totals.remainingTotal,
        totalVat: totals.totalVat, orderType, paymentMethod, discount: discount || undefined, staffId: staffInfo.staffId,
        staffName: staffInfo.staffName, tableName: tableName || undefined, customerId: customerId || undefined,
        pointsEarned: pointsEarned > 0 ? pointsEarned : undefined, pointsSpent: pointsSpent > 0 ? pointsSpent : undefined,
        giftCardAmountUsed: giftCardAmountApplied > 0 ? giftCardAmountApplied : undefined,
    };
    
    syncManager.saveSale(sale);

    if (customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            const pointTransactions: PointTransaction[] = [];
            let pointsChange = 0;
            if (pointsEarned > 0) {
                pointsChange += pointsEarned;
                pointTransactions.push({ id: crypto.randomUUID(), date: sale.date, change: pointsEarned, reason: "Points from purchase", saleId: sale.id });
            }
            if (pointsSpent > 0) {
                pointsChange -= pointsSpent;
                pointTransactions.push({ id: crypto.randomUUID(), date: sale.date, change: -pointsSpent, reason: "Redeemed items", saleId: sale.id });
            }
            const updatedCustomer = {
                ...customer,
                totalLoyaltyPoints: (customer.totalLoyaltyPoints || 0) + pointsChange,
                giftCardBalance: (customer.giftCardBalance || 0) - giftCardAmountApplied,
                pointsHistory: [...(customer.pointsHistory || []), ...pointTransactions],
            };
            syncManager.saveCustomer(updatedCustomer);
        }
    }

    const giftCardPurchase = sale.items.find(item => item.isGiftCard);
    if (giftCardPurchase) {
      if (customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          const newBalance = (customer.giftCardBalance || 0) + giftCardPurchase.priceAtSale;
          syncManager.patchItem('customers', customerId, { giftCardBalance: newBalance });
          setShareableGiftCardModalState({ isOpen: true, data: { type: 'top-up', amount: giftCardPurchase.priceAtSale, customer }});
        }
      } else {
        const newCard: UnclaimedGiftCard = {
          id: `gc-${crypto.randomUUID()}`, amount: giftCardPurchase.priceAtSale, createdAt: new Date().toISOString(),
          creatingSaleId: sale.id, isRedeemed: false,
        };
        syncManager.saveItem('unclaimedGiftCards', newCard);
        setShareableGiftCardModalState({ isOpen: true, data: { type: 'physical-card', card: newCard }});
      }
    } else {
        modalHook.receipt.view(sale);
    }

    cartHook.clearCart();
    setCategoryPath([]);
  };

  const allCategoryPaths = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
        const key = normalizeForLookup(product.name);
        if (!map.has(key)) { map.set(key, product); }
    }
    return map;
  }, [products]);

  const handleAIParsedOrder = useCallback((result: ParsedOrder) => {
    const { orderType, tableName, customerName, items, customItems } = result;
    if ((!items || items.length === 0) && (!customItems || customItems.length === 0)) {
        alert("AI could not find any items in the order.");
        return;
    }
    const tableToAssign = tableName ? tables.find(t => t.name.toLowerCase() === tableName.toLowerCase()) : null;
    const customerToLink = customerName ? customers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) : null;
    if (tableToAssign) {
        const isOccupied = openTabs.some(tab => tab.tableId === tableToAssign.id);
        if (isOccupied) { cartHook.loadTab(tableToAssign.id); } else { cartHook.createEmptyTab(tableToAssign); }
    } else {
        if (cartHook.isTabActive) { cartHook.detachFromTabAndStartNewOrder(); }
    }
    
    setTimeout(() => {
        const findProduct = (name: string): Product | undefined => productMap.get(normalizeForLookup(name));
        const itemsToAdd: { product: Product, quantity: number, note?: string, extras: { product: Product, quantity: number }[] }[] = [];
        const notFoundItems: string[] = [];
        items.forEach(item => {
            const mainProduct = findProduct(item.productName);
            if (mainProduct) {
                const extrasForThisItem: { product: Product, quantity: number }[] = [];
                if (item.extras) {
                    item.extras.forEach(extra => {
                        const extraProduct = findProduct(extra.productName);
                        if (extraProduct) { extrasForThisItem.push({ product: extraProduct, quantity: extra.quantity }); } else { notFoundItems.push(extra.productName); }
                    });
                }
                itemsToAdd.push({ product: mainProduct, quantity: item.quantity, note: item.note, extras: extrasForThisItem });
            } else {
                notFoundItems.push(item.productName);
            }
        });
        if (itemsToAdd.length > 0) { cartHook.addComplexItemsToCart(itemsToAdd); }
        if (customItems && customItems.length > 0) { cartHook.addCustomItemsToCart(customItems); }
        if (orderType) { cartHook.setOrderType(orderType); }
        if (customerToLink) { cartHook.setCustomerId(customerToLink.id); }
        if (notFoundItems.length > 0) { alert(`Could not find the following items, which were not added: ${notFoundItems.join(', ')}.`); }
    }, 100);
  }, [tables, customers, openTabs, productMap, cartHook]);

  const handleSaveProduct = (productData: Omit<Product, 'id'> & { id?: string }) => {
    syncManager.saveProduct(productData);
    modalHook.product.close();
  };
  
  const handleOpenBillPrint = () => {
    const tab = openTabs.find(t => t.id === cartHook.activeTableId);
    if (tab) setBillToPrint(tab);
  };
  
  const handleCustomItemSave = (name: string, price: number, vatRate: number, loyaltyPoints: number) => {
    const customProduct: Product = {
        id: `custom-${crypto.randomUUID()}`, name, priceEatIn: price, priceTakeAway: price, vatRateEatIn: vatRate,
        vatRateTakeAway: vatRate, category: 'Custom', loyaltyPoints: loyaltyPoints > 0 ? loyaltyPoints : undefined,
    };
    cartHook.handleAddToCart(customProduct);
  };
  
  const handleChargeRequest = (paymentMethod: PaymentMethod) => {
      modalHook.confirmSale.open();
  };


  if (dbError) {
    return (
      <div className="bg-red-900 text-white h-screen w-screen flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Fatal Error</h1>
        <p className="text-lg mb-2">Could not connect to the database.</p>
        <p className="text-sm">Please check your Firebase configuration and internet connection. This app cannot function without a database connection.</p>
        <pre className="bg-black/50 p-4 rounded-md mt-4 text-left text-xs whitespace-pre-wrap">{dbError.message}</pre>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col lg:flex-row bg-bg-main overflow-hidden">
      <MainView 
        cartHook={cartHook} modalHook={modalHook} syncDataHook={syncDataHook} categoryPath={categoryPath}
        onNavigate={setCategoryPath} onOpenCustomGiftCard={() => setCustomGiftCardModalOpen(true)} onAIParsedOrder={handleAIParsedOrder}
      />
      <OrderPanel 
        cartHook={cartHook} 
        onChargeRequest={handleChargeRequest}
        onLinkCustomer={handleOpenScannerForLinking} 
        tables={tables} 
        openTabs={openTabs}
        onAddExtraRequest={handleOpenExtrasModal} 
        customer={customers.find(c => c.id === cartHook.customerId)}
      />
      
      <NavMenu
        isOpen={modalHook.nav.isOpen} onClose={modalHook.nav.close} onOpenDashboard={modalHook.dashboard.open}
        onOpenTablePlan={modalHook.tablePlan.open} onViewSale={modalHook.receipt.view} sales={sales} staff={staff}
        shifts={shifts} syncManager={syncManager} customerId={cartHook.customerId} customers={customers}
      />
      <AnalyticsDashboardModal
        isOpen={modalHook.dashboard.isOpen} onClose={() => { modalHook.dashboard.close(); setDashboardInitialView(undefined); }}
        initialView={dashboardInitialView} signOut={signOut} onRequestPrint={(sale) => modalHook.print.print(sale)}
        onRequestEmail={(sale) => modalHook.email.request(sale)} onRequestShare={(sale) => shareReceipt(sale)}
        onRequestEditProduct={modalHook.product.openEdit} onRequestNewProduct={modalHook.product.openNew}
        onRequestEditCustomer={openEditCustomerFromDashboard} onRequestNewCustomer={openNewCustomerFromDashboard}
        onViewSale={modalHook.receipt.view} onLinkCustomerToSale={(id) => { cartHook.setCustomerId(id); modalHook.dashboard.close(); }}
        products={products} sales={sales} staff={staff} shifts={shifts} notes={notes} specialDays={specialDays}
        tables={tables} customers={customers} syncManager={syncManager}
      />
      <ProductModal
        isOpen={modalHook.product.isOpen} onClose={modalHook.product.close} onSave={handleSaveProduct}
        productToEdit={modalHook.product.productToEdit} allCategoryPaths={allCategoryPaths}
      />
       <ConfirmSaleModal
        isOpen={modalHook.confirmSale.isOpen} onClose={modalHook.confirmSale.close} onConfirm={handleConfirmSale}
        paymentMethod={cartHook.paymentMethod} total={cartHook.totals.remainingTotal}
      />
      <CustomItemModal
        isOpen={modalHook.customItem.isOpen} onClose={modalHook.customItem.close} onSave={handleCustomItemSave}
      />
      <ReceiptModal
        isOpen={modalHook.receipt.isOpen} onClose={modalHook.receipt.close} sale={modalHook.receipt.saleData}
        onRequestEmail={(sale) => modalHook.email.request(sale)} onRequestShare={(sale) => shareReceipt(sale)}
      />
      <TablePlanModal
        isOpen={modalHook.tablePlan.isOpen} onClose={modalHook.tablePlan.close} tables={tables}
        openTabs={openTabs.reduce((acc, tab) => ({ ...acc, [tab.id]: tab }), {})} cartHook={cartHook}
      />
      <EmailReceiptModal isOpen={modalHook.email.isOpen} onClose={modalHook.email.close} sale={modalHook.email.saleData} />
      <PrintReceipt sale={modalHook.print.saleData} onPrintComplete={() => modalHook.print.print(null)} />
      <PrintBillModal openTab={billToPrint} onPrintComplete={() => setBillToPrint(null)} />
       <QRCodeScannerModal
          isOpen={qrScannerState.isOpen} onClose={() => setQrScannerState(prev => ({ ...prev, isOpen: false }))}
          onScanSuccess={(data) => { qrScannerState.callback(data); setQrScannerState(prev => ({ ...prev, isOpen: false })); }}
          onCreateNewCustomer={handleCreateNewCustomerFromPOS} onFindCustomer={handleFindCustomerFromScanner}
      />
       <CustomerModal
          isOpen={modalHook.customer.isOpen}
          onClose={modalHook.customer.close}
          onSave={customerModalOnSave}
          customerToEdit={modalHook.customer.customerToEdit}
      />
      <ExtrasSelectionModal
          isOpen={extrasSelectionModal.isOpen} onClose={() => setExtrasSelectionModal({isOpen: false, forItemInstanceId: null})}
          onSelectExtra={handleSelectExtra} products={products}
      />
      <CustomGiftCardModal
        isOpen={customGiftCardModalOpen} onClose={() => setCustomGiftCardModalOpen(false)}
        onSave={cartHook.addGiftCardToCart}
      />
       <ShareableGiftCardModal
          isOpen={shareableGiftCardModalState.isOpen} onClose={() => setShareableGiftCardModalState({ isOpen: false, data: null })}
          cardData={shareableGiftCardModalState.data}
      />
    </div>
  );
};


export default function SingleFileApp() {
    useTheme();
    const { user, loading, error, signIn } = useAuth();

    if (loading) {
        return (
            <div className="w-screen h-screen flex flex-col justify-center items-center p-8 bg-bg-main text-text-primary">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-text-secondary">Loading...</p>
            </div>
        );
    }
    
    if (!user) {
        return <LoginScreen onSignIn={signIn} error={error} />;
    }

    return <AppContent />;
}