import { useState, useEffect, useMemo } from 'react';
import { SyncManager } from '../utils/syncManager';
import { Product, Sale, StaffMember, Shift, DailyNote, SpecialDay, Table, OpenTab, Customer } from '../types';

const syncManager = SyncManager.getInstance();

export function useSyncManagerData() {
  const [version, setVersion] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');

  useEffect(() => {
    const handleUpdate = () => setVersion(v => v + 1);

    const unsubscribeFromUpdates = syncManager.subscribe(handleUpdate);
    const unsubscribeFromStatus = syncManager.subscribeToConnectionStatus(setConnectionStatus);
    
    // Manually trigger first update to get initial data loaded
    handleUpdate();

    return () => {
      unsubscribeFromUpdates();
      unsubscribeFromStatus();
    };
  }, []);

  const data = useMemo(() => {
    return {
      products: syncManager.getProducts(),
      staff: syncManager.getStaff(),
      shifts: syncManager.getShifts(),
      sales: syncManager.getSales(),
      notes: syncManager.getNotes(),
      tables: syncManager.getTables(),
      openTabs: syncManager.getOpenTabs(),
      customers: syncManager.getCustomers(),
      specialDays: Object.fromEntries(syncManager.getSpecialDays().map(d => [d.id, d.eventName])),
      settings: syncManager.getSettings(),
      syncState: {
        pendingCount: syncManager.getPendingCount(),
        error: syncManager.getSyncError(),
      },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]); // Reruns only when data version changes

  return { ...data, connectionStatus, syncManager };
}