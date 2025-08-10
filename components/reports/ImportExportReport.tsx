import React, { useCallback, useState } from 'react';
import { Sale, Product, StaffMember, Shift, SpecialDay } from '../../types';
import * as CsvUtils from '../../utils/csv';
import Icon from '../Icon';
import { db } from '../../firebase';
import { collection, getDocs, writeBatch, doc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import PasswordPromptModal from '../PasswordPromptModal';
import ConfirmActionModal from '../ConfirmActionModal';

const downloadCSV = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const DataSection = ({ title, onExport, onImport, isExporting }: { title: string, onExport: () => void, onImport: (file: File) => void, isExporting?: boolean }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImport(file);
        }
        e.target.value = '';
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">{title}</h3>
            <div className="flex items-center gap-4">
                <button
                    onClick={onExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                    <Icon name={isExporting ? 'clock' : 'download'} className={`w-5 h-5 ${isExporting ? 'animate-spin' : ''}`} />
                    {isExporting ? 'Exporting...' : 'Export to CSV'}
                </button>
                <label className="flex items-center gap-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-green-700 transition-colors cursor-pointer">
                    <Icon name="upload" className="w-5 h-5" />
                    Import from CSV
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                </label>
            </div>
        </div>
    );
};

const ImportExportReport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fetchAllFromCollection = async <T extends {id: string}>(collectionName: string): Promise<T[]> => {
      const snapshot = await getDocs(collection(db, collectionName));
      return snapshot.docs.map(d => ({...d.data() as any, id: d.id })) as T[];
  }

  const handleExport = useCallback(async (type: 'products' | 'sales' | 'rota') => {
    const date = new Date().toISOString().split('T')[0];
    setIsExporting(true);
    try {
        let csvData, fileName;
        switch (type) {
            case 'products':
                const products = await fetchAllFromCollection<Product>('products');
                csvData = CsvUtils.generateProductsCSV(products);
                fileName = `products-export-${date}.csv`;
                break;
            case 'sales':
                const rawSales = await fetchAllFromCollection<Sale>('sales');
                // Sanitize sales and their nested items to prevent circular reference errors.
                const sales = rawSales.map(s => ({
                    id: s.id,
                    date: s.date,
                    orderType: s.orderType,
                    paymentMethod: s.paymentMethod,
                    total: s.total,
                    totalVat: s.totalVat,
                    discount: s.discount,
                    staffId: s.staffId,
                    staffName: s.staffName,
                    items: (s.items || []).map(i => ({
                        id: i.id,
                        name: i.name,
                        priceEatIn: i.priceEatIn,
                        priceTakeAway: i.priceTakeAway,
                        vatRateEatIn: i.vatRateEatIn,
                        vatRateTakeAway: i.vatRateTakeAway,
                        category: i.category,
                        quantity: i.quantity,
                        priceAtSale: i.priceAtSale,
                    })),
                }));
                csvData = CsvUtils.generateSalesCSV(sales);
                fileName = `sales-export-all-${date}.csv`;
                break;
            case 'rota':
                const [staff, shifts, specialDays] = await Promise.all([
                    fetchAllFromCollection<StaffMember>('staff'),
                    fetchAllFromCollection<Shift>('shifts'),
                    fetchAllFromCollection<SpecialDay>('specialDays'),
                ]);
                csvData = CsvUtils.generateRotaCSV(staff, shifts, specialDays);
                fileName = `rota-export-${date}.csv`;
                break;
        }
        downloadCSV(csvData, fileName);
    } catch (err: any) {
        alert(`Export failed: ${err.message}`);
    } finally {
        setIsExporting(false);
    }
  }, []);

  const handleImport = useCallback(async (type: 'products' | 'sales' | 'rota', file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        alert('File is empty or could not be read.');
        return;
      }
      
      setIsImporting(true);
      
      try {
        if (confirm(`Importing will OVERWRITE all existing ${type} data. This action cannot be undone. Are you sure?`)) {
            const batch = writeBatch(db);
            
            if (type === 'rota') {
                const { staff, shifts, specialDays } = CsvUtils.parseRotaCSV(text);
                
                const [existingStaff, existingShifts, existingSpecialDays] = await Promise.all([
                    getDocs(collection(db, 'staff')),
                    getDocs(collection(db, 'shifts')),
                    getDocs(collection(db, 'specialDays')),
                ]);

                existingStaff.forEach(doc => batch.delete(doc.ref));
                existingShifts.forEach(doc => batch.delete(doc.ref));
                existingSpecialDays.forEach(doc => batch.delete(doc.ref));
                
                staff.forEach(s => batch.set(doc(db, 'staff', s.id), s));
                shifts.forEach(s => batch.set(doc(db, 'shifts', s.id), s));
                specialDays.forEach(d => batch.set(doc(db, 'specialDays', d.id), d));
            } else { // Handle 'products' and 'sales'
                const collectionName = type;
                let newDocs: any[];

                if (type === 'products') {
                    newDocs = CsvUtils.parseProductsCSV(text);
                } else { // sales
                    newDocs = CsvUtils.parseSalesCSV(text);
                }

                const existingDocs = await getDocs(collection(db, collectionName));
                existingDocs.forEach(doc => batch.delete(doc.ref));

                newDocs.forEach(item => {
                    batch.set(doc(db, collectionName, item.id), item);
                });
            }
            
            await batch.commit();
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} imported successfully! The page will now reload to reflect the changes.`);
            window.location.reload();
        }
      } catch (e: any) {
        console.error("Error processing CSV import:", e);
        alert(`Failed to import data. Please ensure the CSV file is correctly formatted and try again. Error: ${e.message}`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  }, []);

   const handleDeleteAllSales = async () => {
      setIsDeleting(true);
      setConfirmDeleteModalOpen(false);
      
      try {
          const salesCollection = collection(db, 'sales');
          const salesSnapshot = await getDocs(salesCollection);
          
          if (salesSnapshot.empty) {
              alert('No sales history to delete.');
              setIsDeleting(false);
              return;
          }

          const BATCH_SIZE = 500;
          const batches = [];
          let currentBatch = writeBatch(db);
          let operationsInBatch = 0;

          salesSnapshot.docs.forEach((doc, index) => {
              currentBatch.delete(doc.ref);
              operationsInBatch++;
              if (operationsInBatch === BATCH_SIZE || index === salesSnapshot.docs.length - 1) {
                  batches.push(currentBatch);
                  currentBatch = writeBatch(db);
                  operationsInBatch = 0;
              }
          });
          
          await Promise.all(batches.map(batch => batch.commit()));
          alert('All sales history has been successfully deleted. The page will now reload.');
          window.location.reload();

      } catch (err: any) {
          alert(`Failed to delete sales history: ${err.message}`);
          setIsDeleting(false);
      }
  };


  return (
    <>
      <div className="p-6 bg-gray-100 min-h-full text-gray-800">
        <h2 className="text-3xl font-bold text-brand-primary mb-2">Import/Export Data</h2>
        <p className="text-gray-600 mb-6 max-w-4xl">
          Use these tools to manually back up your data to CSV files or restore data from a backup.
          <strong className="text-red-600"> Warning:</strong> Importing a file will overwrite all existing data for that category. This action is irreversible.
        </p>

        <div className="space-y-6">
          <DataSection 
              title="Products Data"
              onExport={() => handleExport('products')}
              onImport={(file) => handleImport('products', file)}
              isExporting={isExporting || isImporting}
          />
          <DataSection 
              title="Rota Data (Staff, Shifts & Special Days)"
              onExport={() => handleExport('rota')}
              onImport={(file) => handleImport('rota', file)}
              isExporting={isExporting || isImporting}
          />
          <DataSection 
              title="Sales History (All Time)"
              onExport={() => handleExport('sales')}
              onImport={(file) => handleImport('sales', file)}
              isExporting={isExporting || isImporting}
          />
        </div>

        <div className="mt-8">
            <div className="bg-red-900/20 border border-red-700 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-red-300/80 mb-4 max-w-2xl">
                    This action is irreversible and will permanently delete all sales transaction data from the database. This cannot be undone.
                </p>
                <button
                    onClick={() => setPasswordModalOpen(true)}
                    disabled={isDeleting}
                    className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-red-700 transition-colors disabled:bg-gray-500 flex items-center gap-2"
                >
                    <Icon name="trash" className="w-5 h-5"/>
                    {isDeleting ? 'Deleting...' : 'Delete All Sales History'}
                </button>
            </div>
        </div>
      </div>
       <PasswordPromptModal
          isOpen={isPasswordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
          onSuccess={() => {
              setPasswordModalOpen(false);
              setConfirmDeleteModalOpen(true);
          }}
          title="Authorization Required"
          description="Please enter your password to proceed with deleting all sales history."
      />
      <ConfirmActionModal
          isOpen={isConfirmDeleteModalOpen}
          onClose={() => setConfirmDeleteModalOpen(false)}
          onConfirm={handleDeleteAllSales}
          title="Confirm Deletion"
          description={
              <p className="text-text-secondary">
                  Are you absolutely sure you want to delete <strong className="text-red-400">ALL</strong> sales history? This action is permanent and cannot be undone.
              </p>
          }
          confirmText="Yes, Delete All"
          confirmIcon="trash"
          confirmColor="bg-red-600 hover:bg-red-700"
      />
    </>
  );
};

export default ImportExportReport;
