import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Table, Customer } from '../types';
import Icon from './Icon';
import FirestoreSyncIndicator from './FirestoreSyncIndicator';
import CategoryTile from './CategoryTile';
import Breadcrumb from './Breadcrumb';
import ProductCard from './ProductCard';
import Sortable from 'sortablejs';
import AIOrderModal from './AIOrderModal';
import { triggerHapticFeedback } from '../utils/haptics';

// Hook and component types for props
import { useCart } from '../hooks/useCart';
import { useModalState } from '../hooks/useModalState';
import { useSyncManagerData } from '../hooks/useSyncManagerData';

type ParsedItem = { 
    productName: string; 
    quantity: number; 
    note?: string;
    extras?: { productName: string; quantity: number }[]; 
};

type ParsedOrder = { 
    orderType?: 'Eat In' | 'Take Away'; 
    tableName?: string; 
    customerName?: string; 
    items: ParsedItem[];
};

type MainViewProps = {
  cartHook: ReturnType<typeof useCart>;
  modalHook: ReturnType<typeof useModalState>;
  syncDataHook: ReturnType<typeof useSyncManagerData>;
  categoryPath: string[];
  onNavigate: (path: string[]) => void;
  onOpenCustomGiftCard: () => void;
  onAIParsedOrder: (order: ParsedOrder) => void;
};

const categoryColors = [
  "#dc2626", // red-600
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#f97316", // orange-500
  "#7e22ce", // purple-700
  "#db2777", // pink-600
  "#9333ea", // purple-600
  "#0891b2", // cyan-600
];

const giftCardAmounts = [5, 10, 20, 50];

/**
 * Creates a standardized, singular, lowercase key for product lookups.
 * This is the core of the new robust matching logic.
 * e.g., "Americanos " -> "americano", "Americano" -> "americano"
 */
const normalizeForLookup = (str: string): string => {
    if (!str) return '';
    let normalized = str.normalize('NFC').toLowerCase().trim();
    // Simple but effective pluralization removal.
    // Handles most cases like "cappuccinos" -> "cappuccino".
    // The 'ss' check prevents "espresso" from becoming "espress".
    if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
        return normalized.slice(0, -1);
    }
    return normalized;
};


export const MainView = ({ cartHook, modalHook, syncDataHook, categoryPath, onNavigate, onOpenCustomGiftCard, onAIParsedOrder }: MainViewProps) => {
  const { handleAddToCart, addGiftCardToCart, orderType, addComplexItemsToCart } = cartHook;
  const { nav: navModal, product: productModal, customItem: customItemModal } = modalHook;
  const { products, syncState, connectionStatus, settings, syncManager, tables, customers } = syncDataHook;
  
  const gridRef = useRef<HTMLDivElement>(null);
  const sortableInstance = useRef<Sortable | null>(null);
  const [isAIOrderModalOpen, setAIOrderModalOpen] = useState(false);

  // Create a ref to hold the latest settings to avoid stale closures in onEnd
  const settingsRef = useRef(settings);
  useEffect(() => {
      settingsRef.current = settings;
  }, [settings]);

  // New pre-computed lookup map for products. This is more efficient and robust.
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
        const key = normalizeForLookup(product.name);
        // The first product found for a given key wins, preventing duplicates.
        if (!map.has(key)) {
            map.set(key, product);
        }
    }
    return map;
  }, [products]);


  const displayedItems = useMemo(() => {
    if (!products) {
        return [];
    }
    const currentPathStr = categoryPath.join('/');
    const currentPathKey = categoryPath.join('/') || 'root';

    // Logic to determine what to show based on category path
    const directSubcategories = new Set<string>();
    const directProducts: Product[] = [];
    if (categoryPath.length === 0) {
      products.forEach(p => {
        if (p.category) directSubcategories.add(p.category.split('/')[0]);
      });
    } else {
      const currentPathPrefix = currentPathStr + '/';
      products.forEach(p => {
        const category = p.category || '';
        if (category === currentPathStr) directProducts.push(p);
        else if (category.startsWith(currentPathPrefix)) {
          directSubcategories.add(category.substring(currentPathPrefix.length).split('/')[0]);
        }
      });
    }

    const savedCategoryOrder = settings?.categoryOrder?.[currentPathKey] || [];
    const savedProductOrder = settings?.productOrder?.[currentPathKey] || [];
    
    // Create combined list and sort it
    const allItems: (Product | { isCategory: true; name: string; })[] = [
        ...[...directSubcategories].map(name => ({ isCategory: true as const, name })),
        ...directProducts
    ];

    allItems.sort((a, b) => {
        const aIsCat = 'isCategory' in a;
        const bIsCat = 'isCategory' in b;

        if (aIsCat && !bIsCat) return -1;
        if (!aIsCat && bIsCat) return 1;

        const orderArray = aIsCat ? savedCategoryOrder : savedProductOrder;
        const idA = aIsCat ? a.name : a.id;
        const idB = bIsCat ? b.name : b.id;
        
        const indexA = orderArray.indexOf(idA);
        const indexB = orderArray.indexOf(idB);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        return (a.name || '').localeCompare(b.name || '');
    });
    
    return allItems;

  }, [categoryPath, products, settings]);

  // Effect to manage the SortableJS instance
  useEffect(() => {
    if (!gridRef.current || !syncManager) return;

    // Destroy any existing instance before creating a new one.
    // This is crucial for when the categoryPath changes and the component re-renders.
    sortableInstance.current?.destroy();

    sortableInstance.current = new Sortable(gridRef.current, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'ghost-class',
        filter: '[data-name="Custom Item"]',
        onEnd: () => {
            if (!gridRef.current) return;
            
            // Get the new order directly from the DOM, which is the source of truth.
            const children = Array.from(gridRef.current.children);
            const newCategoryOrder: string[] = [];
            const newProductOrder: string[] = [];

            children.forEach(child => {
                const type = child.getAttribute('data-type');
                const id = child.getAttribute('data-id');
                if (id) {
                    if (type === 'category') {
                        newCategoryOrder.push(id);
                    } else if (type === 'product') {
                        newProductOrder.push(id);
                    }
                }
            });
            
            const currentPathKey = categoryPath.join('/') || 'root';
            
            // Use the ref to get the most up-to-date settings object to avoid stale state.
            const newSettings = { 
                categoryOrder: { ...settingsRef.current.categoryOrder }, 
                productOrder: { ...settingsRef.current.productOrder }
            };

            if (newCategoryOrder.length > 0) {
                newSettings.categoryOrder[currentPathKey] = newCategoryOrder;
            } else {
                delete newSettings.categoryOrder[currentPathKey];
            }
            
            if (newProductOrder.length > 0) {
                newSettings.productOrder[currentPathKey] = newProductOrder;
            } else {
                delete newSettings.productOrder[currentPathKey];
            }

            syncManager.saveSettings(newSettings);
        },
    });

    return () => {
        sortableInstance.current?.destroy();
        sortableInstance.current = null;
    };
    // This effect should ONLY re-run when we navigate to a new category.
    // It should NOT re-run when the items are reordered, which was causing the crash.
  }, [categoryPath, syncManager]);


  const isGiftCardCategory = categoryPath.join('/').toLowerCase() === 'gift cards';

  return (
    <main className="relative flex-1 flex flex-col bg-[#13131d] p-4 lg:p-6 pb-28 lg:pb-6 min-h-0">
      <header className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => {
            triggerHapticFeedback();
            navModal.open();
          }} className="p-2 rounded-xl hover:bg-white/5 border border-white/10 transition-all active:scale-95">
            <Icon name="menu" className="w-6 h-6 text-white" />
          </button>
          <Breadcrumb path={categoryPath} onNavigate={onNavigate} />
        </div>
        <div className="flex items-center gap-3">
            <button
                onClick={() => {
                    triggerHapticFeedback();
                    setAIOrderModalOpen(true);
                }}
                className="relative w-12 h-12 rounded-xl p-0.5 flex items-center justify-center bg-gradient-to-br from-blue-500 via-teal-400 to-orange-400 shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95"
                title="AI Order Entry"
                aria-label="Start AI Order Entry"
            >
                <div className="w-full h-full bg-[#1a1a2e] rounded-[10px] flex items-center justify-center">
                    <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-teal-300 to-orange-300">
                        AI
                    </span>
                </div>
            </button>
            <button onClick={() => {
              triggerHapticFeedback();
              productModal.openNew();
            }} className="hidden sm:flex items-center gap-2 bg-[#1a1a2e] border border-white/10 text-white font-black uppercase tracking-wider text-xs py-3 px-4 rounded-xl shadow hover:brightness-110 transition-all active:scale-95">
                <Icon name="plus" className="w-5 h-5" />
                <span>Add Product</span>
            </button>
             <FirestoreSyncIndicator 
                status={connectionStatus}
                pendingItemsCount={syncState.pendingCount}
                error={syncState.error}
            />
        </div>
      </header>
      
      <div className="flex-grow overflow-y-auto -mr-2 pr-2">
        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {categoryPath.length === 0 && (
                <CategoryTile
                    name="Custom Item"
                    onClick={customItemModal.open}
                    color="#8b5cf6"
                />
            )}
            
            {isGiftCardCategory ? (
              <>
                {giftCardAmounts.map((amount, index) => (
                  <button
                    key={amount}
                    onClick={() => addGiftCardToCart(amount)}
                    className="h-36 rounded-xl shadow-lg border border-white/10 hover:scale-[1.02] hover:brightness-110 transition-all active:scale-95 flex flex-col items-center justify-center p-4 text-white cursor-pointer relative overflow-hidden"
                    style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    <Icon name="star" className="w-8 h-8 mb-2 opacity-80 drop-shadow-lg relative z-10"/>
                    <span className="text-3xl font-mono font-black relative z-10 drop-shadow-md">£{amount}</span>
                  </button>
                ))}
                <button
                  onClick={onOpenCustomGiftCard}
                  className="h-36 rounded-xl shadow-lg border border-white/10 hover:scale-[1.02] hover:brightness-110 transition-all active:scale-95 flex flex-col items-center justify-center p-4 text-white cursor-pointer bg-[#1e1e2d] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  <Icon name="edit" className="w-8 h-8 mb-2 opacity-70 relative z-10"/>
                  <span className="text-lg font-black uppercase tracking-tight relative z-10">Custom Amount</span>
                </button>
              </>
            ) : (
                displayedItems.map((item, index) =>
                    'isCategory' in item ? (
                    <CategoryTile
                        key={item.name}
                        name={item.name}
                        onClick={() => onNavigate([...categoryPath, item.name])}
                        color={categoryColors[index % categoryColors.length]}
                    />
                    ) : (
                    <ProductCard
                        key={item.id}
                        product={item}
                        onAddToCart={handleAddToCart}
                        orderType={orderType}
                    />
                    )
                )
            )}
        </div>
      </div>
       <AIOrderModal
          isOpen={isAIOrderModalOpen}
          startListeningOnOpen={true}
          onClose={() => setAIOrderModalOpen(false)}
          products={products}
          tables={tables}
          customers={customers}
          onAIParsedOrder={onAIParsedOrder}
       />
    </main>
  );
};