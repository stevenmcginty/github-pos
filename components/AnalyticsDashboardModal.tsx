import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, StaffMember, Shift, Sale, DailyNote, SpecialDay, Table, Customer } from '../types';
import Icon from './Icon';
import ErrorBoundary from './ErrorBoundary';
import RotaPasswordPrompt from './RotaPasswordPrompt';
import { toLocalDateString } from '../utils/analytics';
import { SyncManager } from '../utils/syncManager';
import QRCodeScannerModal from './QRCodeScannerModal';

import DashboardHome from './reports/DashboardHome';
import Reporting from './reports/Reporting';
import AIInsightsReport from './reports/AIInsightsReport';
import ManageProductsReport from './reports/ManageProductsReport';
import ManageTablesReport from './reports/ManageTablesReport';
import ImportExportReport from './reports/ImportExportReport';
import ThemeCustomizerReport from './reports/ThemeCustomizerReport';
import ManageCustomersReport from './reports/ManageCustomersReport';
import RedeemGiftCardReport from './reports/RedeemGiftCardReport';
import AdminToolsView from './reports/AdminToolsView';


export type View = 'home' | 'ai-insights' | 'products' | 'customers' | 'redeem-gift-card' | 'tables' | 'theme' | 'admin-tools';

interface AnalyticsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  signOut: () => Promise<void>;
  onRequestPrint: (sale: Sale) => void;
  onRequestEmail: (sale: Sale) => void;
  onRequestShare: (sale: Sale) => void;
  onRequestEditProduct: (product: Product) => void;
  onRequestNewProduct: () => void;
  onRequestEditCustomer: (customer: Customer) => void;
  onRequestNewCustomer: () => void;
  onViewSale: (sale: Sale) => void;
  onLinkCustomerToSale: (customerId: string) => void;
  products: Product[];
  sales: Sale[];
  staff: StaffMember[];
  shifts: Shift[];
  notes: DailyNote[];
  specialDays: Record<string, string>;
  tables: Table[];
  customers: Customer[];
  syncManager: SyncManager;
  initialView?: View;
}

const navItems: { id: View; name: string; icon: any }[] = [
  { id: 'home', name: 'Dashboard Home', icon: 'home' },
  { id: 'ai-insights', name: 'AI Insights', icon: 'analytics' },
  { id: 'products', name: 'Manage Products', icon: 'products' },
  { id: 'customers', name: 'Manage Customers', icon: 'users' },
  { id: 'redeem-gift-card', name: 'Redeem Gift Card', icon: 'card' },
  { id: 'tables', name: 'Manage Tables', icon: 'tableCells' },
  { id: 'theme', name: 'Theme Customizer', icon: 'edit' },
  { id: 'admin-tools', name: 'Admin Tools', icon: 'lock' },
];

const AnalyticsDashboardModal = (props: AnalyticsDashboardModalProps) => {
  const { isOpen, onClose, signOut, initialView, onViewSale, notes, specialDays, syncManager, products, sales, staff, shifts, tables, customers, onLinkCustomerToSale, ...reportProps } = props;
  const [activeView, setActiveView] = useState<View>('home');
  const [isAdminToolsUnlocked, setIsAdminToolsUnlocked] = useState(false);

  // State and refs for draggable sidebar
  const sidebarRef = useRef<HTMLElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  
  // State for the note editor, managed by this parent component.
  const [noteEditorText, setNoteEditorText] = useState('');

  // State for the QR scanner modal, managed by the dashboard
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [scannerCallback, setScannerCallback] = useState<(data: string) => void>(() => () => {});

  useEffect(() => {
    if (isOpen) {
      setActiveView(initialView || 'home');
    }
  }, [isOpen, initialView]);

  const requestScan = useCallback((callback: (data: string) => void) => {
    setScannerCallback(() => callback);
    setScannerOpen(true);
  }, []);

  const handleCreateNewCustomer = () => {
    setScannerOpen(false);
    props.onRequestNewCustomer();
  };
  
  // --- Draggable Sidebar Logic ---
  const handleMove = useCallback((clientX: number) => {
    if (!sidebarRef.current) return;
    sidebarRef.current.style.transition = 'none'; // Disable transition for smooth dragging
    const newWidth = clientX;
    const collapsedWidth = 80;
    const expandedWidth = 400; // Allow over-dragging for better feel
    const clampedWidth = Math.max(collapsedWidth, Math.min(newWidth, expandedWidth));
    sidebarRef.current.style.width = `${clampedWidth}px`;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => handleMove(e.clientX), [handleMove]);
  const handleTouchMove = useCallback((e: TouchEvent) => handleMove(e.touches[0].clientX), [handleMove]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    if (sidebarRef.current) {
        sidebarRef.current.style.transition = ''; // Re-enable transition for snapping
        const width = sidebarRef.current.offsetWidth;
        const midpoint = (80 + 256) / 2; // Midpoint between collapsed and expanded state
        setIsMenuCollapsed(width < midpoint);
        sidebarRef.current.style.width = ''; // Let CSS class take over
    }
  }, [setIsMenuCollapsed]);

  useEffect(() => {
    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleMouseMove, handleDragEnd, handleTouchMove]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  // --- End Draggable Sidebar Logic ---

  const handleSetEventName = (dayKey: string) => {
    const currentName = specialDays[dayKey] || '';
    const newName = window.prompt(`Set an event name for this day.\nLeave blank to remove.`, currentName);

    if (newName === null) return; // User cancelled

    syncManager.saveSpecialDay({
        id: dayKey,
        eventName: newName.trim(),
        lastUpdated: new Date().toISOString()
    });
  };

  const todayDateString = useMemo(() => toLocalDateString(new Date()), []);
  
  const todaysNote = useMemo(() => {
    return notes.find(n => n.id === todayDateString);
  }, [notes, todayDateString]);
  
  // Effect to sync the editor state when the underlying note data changes
  useEffect(() => {
    if (activeView === 'home') {
      setNoteEditorText(todaysNote?.note || '');
    }
  }, [todaysNote, activeView]);

  const handleSaveNote = () => {
    syncManager.saveNote({
      id: todayDateString,
      note: noteEditorText, // Use the state from this component
      lastUpdated: new Date().toISOString()
    });
  };


  if (!isOpen) return null;

  const handleNavClick = (view: View) => {
    // Always lock the admin tools when navigating away.
    if (activeView === 'admin-tools' && view !== 'admin-tools') {
      setIsAdminToolsUnlocked(false);
    }
    setActiveView(view);
  };

  const renderContent = () => {
    if (activeView === 'admin-tools' && !isAdminToolsUnlocked) {
      return (
        <RotaPasswordPrompt
          onSuccess={() => setIsAdminToolsUnlocked(true)}
          onCancel={() => setActiveView('home')}
          title="Admin Tools Locked"
          description="Please re-enter your password to access staff rota and data import/export tools."
        />
      );
    }
    
    switch (activeView) {
      case 'home': return <DashboardHome sales={sales} onViewSale={onViewSale} noteText={noteEditorText} onNoteTextChange={setNoteEditorText} onSaveNote={handleSaveNote} />;
      case 'ai-insights': return <AIInsightsReport sales={sales} products={products}/>;
      case 'products': return <ManageProductsReport products={products} syncManager={syncManager} onRequestEditProduct={reportProps.onRequestEditProduct} onRequestNewProduct={reportProps.onRequestNewProduct} />;
      case 'customers': return <ManageCustomersReport customers={customers} syncManager={syncManager} onLinkCustomerToSale={onLinkCustomerToSale} onRequestNew={props.onRequestNewCustomer} onRequestEdit={props.onRequestEditCustomer} />;
      case 'redeem-gift-card': return <RedeemGiftCardReport syncManager={syncManager} customers={customers} onRequestScan={requestScan} />;
      case 'tables': return <ManageTablesReport tables={tables} syncManager={syncManager} />;
      case 'admin-tools': return <AdminToolsView 
          specialDays={specialDays} 
          onSetEventName={handleSetEventName} 
          syncManager={syncManager} 
          staff={staff} 
          shifts={shifts}
          sales={sales}
          products={products}
          notes={notes}
          onRequestPrint={props.onRequestPrint}
          onRequestEmail={props.onRequestEmail}
          onRequestShare={props.onRequestShare}
      />;
      case 'theme': return <ThemeCustomizerReport />;
      default: return <DashboardHome sales={sales} onViewSale={onViewSale} noteText={noteEditorText} onNoteTextChange={setNoteEditorText} onSaveNote={handleSaveNote} />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" onClick={onClose}>
        <div 
          className="bg-gray-100 w-full h-full lg:w-[95%] lg:h-[95%] lg:rounded-2xl lg:shadow-2xl flex overflow-hidden pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)]" 
          onClick={(e) => e.stopPropagation()}
        >
            <>
              <aside 
                ref={sidebarRef}
                className={`bg-bg-panel text-text-primary p-4 flex flex-col flex-shrink-0 relative transition-all duration-300 ease-in-out ${isMenuCollapsed ? 'w-20' : 'w-64'}`}>
                  <div className={`flex items-center mb-8 ${isMenuCollapsed ? 'justify-center' : 'justify-between'}`}>
                      {!isMenuCollapsed && <h2 className="text-xl font-bold text-accent">Dashboard</h2>}
                      <button
                          onClick={() => setIsMenuCollapsed(!isMenuCollapsed)}
                          className="p-2 rounded-md hover:bg-bg-main"
                          title={isMenuCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                      >
                          <Icon name="menu" className="w-6 h-6" />
                      </button>
                  </div>
                <nav className="flex-grow">
                  <ul>
                    {navItems.map(item => (
                      <li key={item.id} className="mb-2">
                        <button
                          onClick={() => handleNavClick(item.id)}
                          title={isMenuCollapsed ? item.name : undefined}
                          className={`w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors ${
                            activeView === item.id ? 'bg-accent text-text-on-accent font-semibold' : 'hover:bg-bg-main'
                          } ${isMenuCollapsed ? 'justify-center' : ''}`}
                        >
                          <Icon name={item.icon} className="w-5 h-5" />
                          {!isMenuCollapsed && <span>{item.name}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="mt-auto">
                   <button onClick={signOut} title={isMenuCollapsed ? "Sign Out" : undefined} className={`w-full flex items-center gap-3 font-bold mb-2 p-3 rounded-md text-left transition-colors bg-red-600 hover:bg-red-700 text-white ${isMenuCollapsed ? 'justify-center' : ''}`}>
                      <Icon name="logout" className="w-5 h-5" />
                      {!isMenuCollapsed && <span>Sign Out</span>}
                  </button>
                  <button onClick={onClose} title={isMenuCollapsed ? "Close Dashboard" : undefined} className={`w-full flex items-center gap-3 font-bold p-3 rounded-md text-left transition-colors bg-text-secondary hover:bg-opacity-80 text-bg-main ${isMenuCollapsed ? 'justify-center' : ''}`}>
                      <Icon name="close" className="w-5 h-5" />
                      {!isMenuCollapsed && <span>Close Dashboard</span>}
                  </button>
                </div>
                <div
                    className="absolute top-0 -right-1 h-full w-4 cursor-col-resize z-20"
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                    aria-label="Resize sidebar"
                />
              </aside>
              <main className="flex-grow bg-bg-main overflow-y-auto">
                {renderContent()}
              </main>
            </>
        </div>
      </div>
      <QRCodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(data) => {
          setScannerOpen(false);
          scannerCallback(data);
        }}
        onCreateNewCustomer={handleCreateNewCustomer}
        onFindCustomer={() => {}}
      />
    </>
  );
};

export default AnalyticsDashboardModal;