
import { DailyNote, SpecialDay, Sale, Product, StaffMember, Shift, Table, OpenTab, Settings, Customer, UnclaimedGiftCard } from '../types';
import { db, auth } from '../firebase';
import { doc, setDoc, writeBatch, deleteDoc, collection, onSnapshot, query, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { loadFromLocalStorage, saveToLocalStorage } from './storage';

const QUEUE_KEY = 'offline-queue-v4';
const DELETIONS_QUEUE_KEY = 'offline-deletions-queue-v4';
const UPDATES_QUEUE_KEY = 'offline-updates-queue-v1';
const POISON_QUEUE_KEY = 'offline-poison-queue-v1';
const SETTINGS_KEY = 'settings-cache-v1';

let instance: SyncManager | null = null;

type QueueItem = {
  collection: 'sales' | 'products' | 'staff' | 'shifts' | 'dailyNotes' | 'specialDays' | 'tables' | 'openTabs' | 'customers' | 'unclaimedGiftCards';
  data: any;
};
type DeletionItem = { collection: QueueItem['collection']; id: string };
type UpdateItem = { collection: DeletionItem['collection'], id: string, data: Partial<any> };
type PoisonItem = QueueItem | DeletionItem | UpdateItem;


/**
 * A robust recursive sanitizer to remove 'undefined' values that Firestore rejects.
 */
const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== undefined);
  }
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        const sanitizedValue = sanitizeForFirestore(value);
        if (sanitizedValue !== undefined) {
            newObj[key] = sanitizedValue;
        }
      }
    }
  }
  return newObj;
};


/**
 * Converts any Firestore Timestamp objects within a data structure to ISO date strings.
 * This is crucial for ensuring data retrieved from Firestore is serializable and
 * consistent with the application's TypeScript types before being stored in local state.
 */
const convertTimestampsToISOStrings = (data: any): any => {
    // Base cases for recursion: handle non-objects, null, and undefined.
    if (data === null || data === undefined || typeof data !== 'object') {
        return data;
    }

    // The specific check for a Firestore Timestamp object. It's an object with `seconds` and `nanoseconds` properties and a `toDate` method.
    // This check is specific enough to avoid misidentifying other objects (like moment.js objects).
    if (typeof data.toDate === 'function' && typeof data.seconds === 'number' && typeof data.nanoseconds === 'number') {
        return data.toDate().toISOString();
    }
    
    // Recurse for arrays: create a new array with converted items.
    if (Array.isArray(data)) {
        return data.map(item => convertTimestampsToISOStrings(item));
    }

    // Recurse for plain objects. The constructor check avoids iterating over class instances (e.g., JS Date).
    if (data.constructor === Object) {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            // Ensure we only process own properties.
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                res[key] = convertTimestampsToISOStrings(data[key]);
            }
        }
        return res;
    }
    
    // Return any other type of object (like a JS Date) as-is.
    return data;
};


/**
 * A dedicated manager to handle offline queuing and syncing for all data.
 * This class ensures data is saved locally first and then reliably synced to Firestore,
 * preventing race conditions and data loss.
 */
export class SyncManager {
  private queue: QueueItem[] = [];
  private deletionsQueue: DeletionItem[] = [];
  private updatesQueue: UpdateItem[] = [];
  private poisonQueue: PoisonItem[] = [];

  // Firestore data cache
  private firestoreNotes: DailyNote[] = [];
  private firestoreSpecialDays: SpecialDay[] = [];
  private firestoreSales: Sale[] = [];
  private firestoreProducts: Product[] = [];
  private firestoreStaff: StaffMember[] = [];
  private firestoreShifts: Shift[] = [];
  private firestoreTables: Table[] = [];
  private firestoreOpenTabs: OpenTab[] = [];
  private firestoreCustomers: Customer[] = [];
  private firestoreUnclaimedGiftCards: UnclaimedGiftCard[] = [];
  private settings: Settings = { categoryOrder: {}, productOrder: {} };
  private isLocalUpdate = false; // Flag to ignore self-inflicted Firestore updates

  private isSyncing = false;
  private isOnline = navigator.onLine;
  private isFirestoreReady = false; 
  private listenersInitialized = false; // Flag to ensure listeners are only set up once.
  private syncError: string | null = null;
  private syncTimeout: number | null = null;
  private syncRetryDelay = 1000; // Start with 1 second delay for retries
  private readonly MAX_RETRY_DELAY = 60000; // Max 1 minute delay

  private updateListeners = new Set<() => void>();
  private connectionStatusListeners = new Set<(status: 'connecting' | 'online' | 'offline') => void>();


  private constructor() {
    this.queue = loadFromLocalStorage(QUEUE_KEY, []);
    this.deletionsQueue = loadFromLocalStorage(DELETIONS_QUEUE_KEY, []);
    this.updatesQueue = loadFromLocalStorage(UPDATES_QUEUE_KEY, []);
    this.poisonQueue = loadFromLocalStorage(POISON_QUEUE_KEY, []);
    this.settings = loadFromLocalStorage(SETTINGS_KEY, { 
        categoryOrder: {}, 
        productOrder: {}
    });
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Defer listener initialization until a user is authenticated.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            this.startListeners();
        } else {
            // User logged out, SDK will handle tearing down listeners.
            // Reset flags to allow re-initialization on next login.
            this.listenersInitialized = false;
            this.isFirestoreReady = false;
        }
    });
  }

  public static getInstance(): SyncManager {
    if (!instance) {
      instance = new SyncManager();
    }
    return instance;
  }
  
  // --- Public API ---

  public getPendingCount = (): number => this.queue.length + this.deletionsQueue.length + this.updatesQueue.length;
  public getSyncError = (): string | null => this.syncError;
  
  public subscribe(listener: () => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  public subscribeToConnectionStatus(listener: (status: 'connecting' | 'online' | 'offline') => void): () => void {
    this.connectionStatusListeners.add(listener);
    // Immediately call with current status
    const currentStatus = this.isOnline ? ((this.getPendingCount() > 0) ? 'connecting' : 'online') : 'offline';
    listener(currentStatus);
    return () => this.connectionStatusListeners.delete(listener);
  }

  public saveItem(collection: QueueItem['collection'], data: any) {
    const sanitizedData = sanitizeForFirestore(data);
    const index = this.queue.findIndex(item => item.collection === collection && item.data.id === sanitizedData.id);
    if (index > -1) {
      this.queue[index] = { collection, data: sanitizedData };
    } else {
      this.queue.push({ collection, data: sanitizedData });
    }
    saveToLocalStorage(QUEUE_KEY, this.queue);
    
    // UI update is prioritized and happens instantly
    this.notify();
    // Sync is requested, but debounced
    this.requestSync();
  }

  public patchItem(collection: UpdateItem['collection'], id: string, data: Partial<any>) {
    const sanitizedData = sanitizeForFirestore(data);
    const existingUpdateIndex = this.updatesQueue.findIndex(u => u.collection === collection && u.id === id);

    if (existingUpdateIndex > -1) {
        this.updatesQueue[existingUpdateIndex].data = {
            ...this.updatesQueue[existingUpdateIndex].data,
            ...sanitizedData
        };
    } else {
        this.updatesQueue.push({ collection, id, data: sanitizedData });
    }
    
    saveToLocalStorage(UPDATES_QUEUE_KEY, this.updatesQueue);
    this.notify();
    this.requestSync();
  }

  public saveNote = (note: DailyNote) => this.saveItem('dailyNotes', note);
  public saveSpecialDay = (day: SpecialDay) => this.saveItem('specialDays', day);
  
  public saveSale = (sale: Sale) => {
    this.saveItem('sales', sale);
  }

  public saveProduct = (product: Omit<Product, 'id'> & { id?: string }) => {
    const itemToSave = { ...product, id: product.id || `offline-${crypto.randomUUID()}` };
    this.saveItem('products', itemToSave);
  }
  public saveStaff = (staff: Omit<StaffMember, 'id'> & { id?: string }) => {
    const itemToSave = { ...staff, id: staff.id || `offline-${crypto.randomUUID()}` };
    this.saveItem('staff', itemToSave);
  }
  public saveShift = (shift: Omit<Shift, 'id'> & { id?: string }) => {
    const itemToSave = { ...shift, id: shift.id || `offline-${crypto.randomUUID()}` };
    this.saveItem('shifts', itemToSave);
  }
  public saveTable = (table: Omit<Table, 'id'> & { id?: string }) => {
    const itemToSave = { ...table, id: table.id || `offline-${crypto.randomUUID()}` };
    this.saveItem('tables', itemToSave);
  }
  
  public saveCustomer = (customer: Omit<Customer, 'id'> & { id?: string }) => {
    const itemToSave: Customer = {
        id: customer.id || crypto.randomUUID(),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalLoyaltyPoints: customer.totalLoyaltyPoints ?? 0,
        giftCardBalance: customer.giftCardBalance ?? 0,
        pointsHistory: customer.pointsHistory ?? [],
    };
    this.saveItem('customers', itemToSave);
  }

  public saveSettings = (newSettings: Settings) => {
    this.isLocalUpdate = true; // Set flag before writing to Firestore
    const settingsWithTimestamp = { ...newSettings, lastUpdated: Date.now() };
    this.settings = settingsWithTimestamp;
    saveToLocalStorage(SETTINGS_KEY, this.settings);
    if (db) {
        // Use the timestamped version for saving
        setDoc(doc(db, 'settings', 'main'), settingsWithTimestamp, { merge: true }).catch(err => console.error("Failed to sync settings:", err));
    }
    this.notify();
  }

  public deleteItem = (collection: DeletionItem['collection'], id: string) => {
    // If item is in the write queue, just remove it from there
    const queueIndex = this.queue.findIndex(item => item.collection === collection && item.data.id === id);
    if (queueIndex > -1) {
        this.queue.splice(queueIndex, 1);
        saveToLocalStorage(QUEUE_KEY, this.queue);
    } else {
        // Otherwise, add to deletion queue for synced items
        const alreadyQueued = this.deletionsQueue.some(d => d.collection === collection && d.id === id);
        if (!alreadyQueued) {
            this.deletionsQueue.push({ collection, id });
            saveToLocalStorage(DELETIONS_QUEUE_KEY, this.deletionsQueue);
        }
    }
    
    this.notify();
    this.requestSync();
  }

  private getMergedData<T extends { id: string }>(
      firestoreData: T[],
      collectionName: QueueItem['collection']
  ): T[] {
      const dataMap = new Map<string, T>();
      
      firestoreData.forEach(item => dataMap.set(item.id, item));
      
      this.queue
        .filter(item => item.collection === collectionName)
        .forEach(item => dataMap.set(item.data.id, item.data));
      
      this.updatesQueue
        .filter(update => update.collection === collectionName)
        .forEach(update => {
            if (dataMap.has(update.id)) {
                const currentItem = dataMap.get(update.id)!;
                dataMap.set(update.id, { ...currentItem, ...update.data });
            }
        });
      
      this.deletionsQueue.forEach(del => {
          if (del.collection === collectionName) dataMap.delete(del.id);
      });

      return Array.from(dataMap.values());
  }

  public getNotes = (): DailyNote[] => this.getMergedData(this.firestoreNotes, 'dailyNotes');
  public getSpecialDays = (): SpecialDay[] => this.getMergedData(this.firestoreSpecialDays, 'specialDays');
  public getSales = (): Sale[] => this.getMergedData(this.firestoreSales, 'sales');
  public getProducts = (): Product[] => this.getMergedData(this.firestoreProducts, 'products');
  public getStaff = (): StaffMember[] => this.getMergedData(this.firestoreStaff, 'staff');
  public getShifts = (): Shift[] => this.getMergedData(this.firestoreShifts, 'shifts');
  public getTables = (): Table[] => this.getMergedData(this.firestoreTables, 'tables');
  public getOpenTabs = (): OpenTab[] => this.getMergedData(this.firestoreOpenTabs, 'openTabs');
  public getCustomers = (): Customer[] => this.getMergedData(this.firestoreCustomers, 'customers');
  public getUnclaimedGiftCards = (): UnclaimedGiftCard[] => this.getMergedData(this.firestoreUnclaimedGiftCards, 'unclaimedGiftCards');
  public getSettings = (): Settings => this.settings;


  // --- Internal Sync Logic ---

  private startListeners() {
    if (this.listenersInitialized || !db) return;
    this.listenersInitialized = true;
    console.log("User authenticated, starting Firestore listeners.");

    const setupListener = (path: string, setter: (data: any[]) => void) => {
      onSnapshot(query(collection(db, path)), (snapshot) => {
        const items = snapshot.docs.map(doc => {
            const dataWithTimestamps = doc.data();
            const dataWithStrings = convertTimestampsToISOStrings(dataWithTimestamps);
            return { ...dataWithStrings, id: doc.id };
        });
        setter(items);
        this.notify();
      }, (error) => console.error(`Firestore listener error on '${path}':`, error));
    };

    setupListener('dailyNotes', (d) => this.firestoreNotes = d);
    setupListener('specialDays', (d) => this.firestoreSpecialDays = d);
    setupListener('sales', (d) => this.firestoreSales = d);
    setupListener('products', (d) => this.firestoreProducts = d);
    setupListener('staff', (d) => this.firestoreStaff = d);
    setupListener('shifts', (d) => this.firestoreShifts = d);
    setupListener('tables', (d) => this.firestoreTables = d);
    setupListener('openTabs', (d) => this.firestoreOpenTabs = d);
    setupListener('customers', (d) => this.firestoreCustomers = d);
    setupListener('unclaimedGiftCards', (d) => this.firestoreUnclaimedGiftCards = d);

    // Combined listener for settings data and connection status.
    onSnapshot(doc(db, 'settings', 'main'), { includeMetadataChanges: true }, (docSnap) => {
        // Part 1: Handle connection status first. This is our gatekeeper for readiness.
        this.updateConnectionStatus(docSnap.metadata.fromCache);
        if (!docSnap.metadata.fromCache && !this.isFirestoreReady) {
            console.log("Firestore connection established, triggering initial sync.");
            this.isFirestoreReady = true;
            this.requestSync();
        }

        // Part 2: Handle data sync, but check the flag first to prevent race conditions.
        if (this.isLocalUpdate) {
            this.isLocalUpdate = false;
            console.log("SyncManager: Ignoring local settings update echo from Firestore.");
            return;
        }
      
        if (docSnap.exists()) {
            const localSettingsTimestamp = this.settings.lastUpdated || 0;
            const remoteSettings = docSnap.data() as Settings;
            // Only update if remote data is newer.
            if ((remoteSettings.lastUpdated || 0) > localSettingsTimestamp) {
                console.log("SyncManager: Received newer settings from Firestore.");
                this.settings = remoteSettings;
                saveToLocalStorage(SETTINGS_KEY, this.settings);
                this.notify();
            }
        }
    });
  }

  private notify = () => this.updateListeners.forEach(l => l());

  private updateConnectionStatus(fromCache: boolean) {
    let status: 'connecting' | 'online' | 'offline';
    if (!this.isOnline) {
      status = 'offline';
    } else {
      status = fromCache ? 'connecting' : 'online';
    }
    this.connectionStatusListeners.forEach(l => l(status));
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.updateConnectionStatus(true); // Assume connecting, wait for onSnapshot to confirm
    this.requestSync();
    this.notify();
  }
  
  private handleOffline = () => {
    this.isOnline = false;
    this.isFirestoreReady = false; // Connection is lost, must be re-established
    this.updateConnectionStatus(true); // Offline is a form of 'fromCache'
    this.notify();
  }

  private requestSync = (isRetry = false) => {
    if (this.syncTimeout) clearTimeout(this.syncTimeout);
    // Use exponential backoff for retries, otherwise use a standard debounce delay.
    const delay = isRetry ? this.syncRetryDelay : 500;
    this.syncTimeout = window.setTimeout(() => this.triggerSync(), delay);
  }
  
  private async triggerSync() {
    if (!this.isOnline || !this.isFirestoreReady || this.isSyncing || !db || this.getPendingCount() === 0) {
        return;
    }

    this.isSyncing = true;
    this.notify();

    const BATCH_SIZE = 499;
    let hadErrorsThisRun = false;

    try {
        // Process deletions
        while (this.deletionsQueue.length > 0) {
            const chunk = this.deletionsQueue.splice(0, BATCH_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(item => batch.delete(doc(db, item.collection, item.id)));

            try {
                await batch.commit();
                saveToLocalStorage(DELETIONS_QUEUE_KEY, this.deletionsQueue);
            } catch (error) {
                console.error("Firestore deletions batch failed. Quarantining items:", error);
                this.poisonQueue.push(...chunk);
                saveToLocalStorage(POISON_QUEUE_KEY, this.poisonQueue);
                saveToLocalStorage(DELETIONS_QUEUE_KEY, this.deletionsQueue);
                hadErrorsThisRun = true;
                break; // Stop processing this queue type for now
            }
        }

        // Process updates
        while (this.updatesQueue.length > 0) {
            const chunk = this.updatesQueue.splice(0, BATCH_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(item => batch.update(doc(db, item.collection, item.id), item.data));
            
            try {
                await batch.commit();
                saveToLocalStorage(UPDATES_QUEUE_KEY, this.updatesQueue);
            } catch(error) {
                console.error("Firestore updates batch failed. Quarantining items:", error);
                this.poisonQueue.push(...chunk);
                saveToLocalStorage(POISON_QUEUE_KEY, this.poisonQueue);
                saveToLocalStorage(UPDATES_QUEUE_KEY, this.updatesQueue);
                hadErrorsThisRun = true;
                break;
            }
        }

        // Process creations
        while (this.queue.length > 0) {
            const chunk = this.queue.splice(0, BATCH_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(item => {
                const docRef = doc(db, item.collection, item.data.id);
                batch.set(docRef, item.data);
            });

            try {
                await batch.commit();
                saveToLocalStorage(QUEUE_KEY, this.queue);
            } catch(error) {
                console.error("Firestore creations batch failed. Quarantining items:", error);
                this.poisonQueue.push(...chunk);
                saveToLocalStorage(POISON_QUEUE_KEY, this.poisonQueue);
                saveToLocalStorage(QUEUE_KEY, this.queue);
                hadErrorsThisRun = true;
                break;
            }
        }

        if (hadErrorsThisRun) {
            this.syncError = "Some data failed to sync and was quarantined.";
            this.syncRetryDelay = Math.min(this.syncRetryDelay * 2, this.MAX_RETRY_DELAY);
        } else {
            this.syncRetryDelay = 1000;
            this.syncError = null; // Clear any previous error on a fully successful run
        }

    } catch (e) {
        console.error("Critical error in triggerSync orchestration:", e);
        this.syncError = "An unexpected critical error occurred during sync.";
        hadErrorsThisRun = true;
    } finally {
        this.isSyncing = false;
        // Schedule a retry if there are still items or if there was an error
        if ((this.getPendingCount() > 0 || hadErrorsThisRun) && this.isOnline) {
            this.requestSync(true);
        }
        this.notify();
    }
  }
}