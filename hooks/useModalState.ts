
import { useState, useCallback } from 'react';
import { Product, Sale, Customer } from '../types';

export function useModalState() {
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isNavOpen, setNavOpen] = useState(false);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [isConfirmSaleModalOpen, setConfirmSaleModalOpen] = useState(false);
  const [isCustomItemModalOpen, setCustomItemModalOpen] = useState(false);
  const [isTablePlanModalOpen, setTablePlanModalOpen] = useState(false);
  
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [saleToView, setSaleToView] = useState<Sale | null>(null);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [saleToEmail, setSaleToEmail] = useState<Sale | null>(null);

  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const openCustomerModalForNew = useCallback(() => {
    setCustomerToEdit(null);
    setCustomerModalOpen(true);
  }, []);

  const openCustomerModalForEdit = useCallback((customer: Customer) => {
    setCustomerToEdit(customer);
    setCustomerModalOpen(true);
  }, []);

  const closeCustomerModal = useCallback(() => {
    setCustomerModalOpen(false);
    setCustomerToEdit(null);
  }, []);

  const openProductModalForEdit = useCallback((product: Product) => {
    setProductToEdit(product);
    setProductModalOpen(true);
  }, []);

  const openProductModalForNew = useCallback(() => {
    setProductToEdit(null);
    setProductModalOpen(true);
  }, []);

  const closeProductModal = useCallback(() => {
    setProductModalOpen(false);
    setProductToEdit(null);
  }, []);

  return {
    dashboard: { isOpen: isDashboardOpen, open: () => setDashboardOpen(true), close: () => setDashboardOpen(false) },
    nav: { isOpen: isNavOpen, open: () => setNavOpen(true), close: () => setNavOpen(false) },
    product: { isOpen: isProductModalOpen, openNew: openProductModalForNew, openEdit: openProductModalForEdit, close: closeProductModal, productToEdit },
    confirmSale: { isOpen: isConfirmSaleModalOpen, open: () => setConfirmSaleModalOpen(true), close: () => setConfirmSaleModalOpen(false) },
    customItem: { isOpen: isCustomItemModalOpen, open: () => setCustomItemModalOpen(true), close: () => setCustomItemModalOpen(false) },
    tablePlan: { isOpen: isTablePlanModalOpen, open: () => setTablePlanModalOpen(true), close: () => setTablePlanModalOpen(false) },
    receipt: { isOpen: !!saleToView, view: setSaleToView, close: () => setSaleToView(null), saleData: saleToView },
    print: { print: setSaleToPrint, saleData: saleToPrint },
    email: { isOpen: !!saleToEmail, request: setSaleToEmail, close: () => setSaleToEmail(null), saleData: saleToEmail },
    customer: { isOpen: isCustomerModalOpen, openNew: openCustomerModalForNew, openEdit: openCustomerModalForEdit, close: closeCustomerModal, customerToEdit },
  };
}
