


const CACHE_NAME = 'cafe-pos-cache-v34-history'; // Bump version
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  '/components/SingleFileApp.tsx',
  '/firebase.ts',
  '/types.ts',
  '/favicon.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  // Firebase SDKs from official CDN
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js',
  
  // Components
  '/components/MainView.tsx', 
  '/components/OrderPanel.tsx', 
  '/components/ProductCard.tsx',
  '/components/CartItem.tsx',
  '/components/ProductModal.tsx',
  '/components/SalesModal.tsx',
  '/components/AnalyticsDashboardModal.tsx',
  '/components/ReceiptModal.tsx',
  '/components/EmailReceiptModal.tsx',
  '/components/PrintReceipt.tsx',
  '/components/Icon.tsx',
  '/components/CategoryTile.tsx',
  '/components/Breadcrumb.tsx',
  '/components/RecentTransactions.tsx',
  '/components/ConfirmSaleModal.tsx',
  '/components/CustomItemModal.tsx',
  '/components/ItemNoteModal.tsx',
  '/components/ReceiptContent.tsx',
  '/components/ErrorBoundary.tsx',
  '/components/StaffModal.tsx',
  '/components/ShiftModal.tsx',
  '/components/FirestoreSyncIndicator.tsx',
  '/components/RotaPasswordPrompt.tsx',
  '/components/InstallPWAButton.tsx',
  '/components/WeeklyRota.tsx',
  '/components/DateRangePicker.tsx',
  '/components/AdjustShiftsModal.tsx',
  '/components/AdjustPointsModal.tsx',
  '/components/TablePlanModal.tsx',
  '/components/PrintBillModal.tsx',
  '/components/CustomerModal.tsx',
  '/components/CustomerQRCodeModal.tsx',
  '/components/CustomerHistoryModal.tsx',
  '/components/ExtrasSelectionModal.tsx',
  '/components/AIOrderModal.tsx',
  '/components/PasswordPromptModal.tsx',
  '/components/ConfirmActionModal.tsx',
  
  // Reports
  '/components/reports/Reporting.tsx',
  '/components/reports/TransactionsReport.tsx',
  '/components/reports/TopProductsReport.tsx',
  '/components/reports/SalesHistoryReport.tsx',
  '/components/reports/AIInsightsReport.tsx',
  '/components/reports/ManageCategoriesReport.tsx',
  '/components/reports/ManageProductsReport.tsx',
  '/components/reports/ManageTablesReport.tsx',
  '/components/reports/ManageCustomersReport.tsx',
  '/components/reports/RotaReport.tsx',
  '/components/reports/DashboardHome.tsx',
  '/components/reports/ImportExportReport.tsx',
  '/components/reports/ThemeCustomizerReport.tsx',
  '/components/reports/AdminToolsView.tsx',
  // '/components/reports/LoyaltyReport.tsx', // This component is now obsolete.

  // Hooks
  '/hooks/useLocalStorage.ts',
  '/hooks/useOnlineStatus.ts',
  '/hooks/useAuth.ts',
  '/hooks/useCart.ts', 
  '/hooks/useModalState.ts', 
  '/hooks/useSyncManagerData.ts',
  '/hooks/useTheme.ts',

  // Utils & Services
  '/utils/storage.ts',
  '/utils/vat.ts',
  '/utils/csv.ts',
  '/utils/analytics.ts',
  '/utils/rota.ts',
  '/utils/syncManager.ts',
  '/utils/receipts.ts',
  '/utils/loyalty.ts',
  '/utils/haptics.ts'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        const cachePromises = urlsToCache.map(urlToCache => {
            return fetch(new Request(urlToCache, {cache: 'reload'}))
                .then(response => {
                    if (response.ok) {
                        return cache.put(urlToCache, response);
                    }
                    console.warn(`Failed to cache ${urlToCache}: Status ${response.status}`);
                    return Promise.resolve();
                }).catch(err => {
                    console.error(`Fetch error for ${urlToCache}:`, err);
                });
        });
        return Promise.all(cachePromises);
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                if (event.request.method === 'GET') {
                  cache.put(event.request, responseToCache);
                }
              });
            return networkResponse;
          }
        ).catch(error => {
            console.log('Fetch failed; returning offline page instead.', error);
        });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});