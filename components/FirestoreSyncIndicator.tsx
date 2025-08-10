import React from 'react';
import Icon from './Icon';

interface FirestoreSyncIndicatorProps {
  status: 'connecting' | 'online' | 'offline';
  pendingItemsCount: number;
  error: string | null;
}

const FirestoreSyncIndicator = ({ status, pendingItemsCount, error }: FirestoreSyncIndicatorProps) => {
  let statusText: string;
  let bgColor: string;
  let iconName: 'clock' | 'checkCircle' | 'xCircle' | 'upload';
  let title: string;
  
  if (error) {
    statusText = `Sync Error`;
    bgColor = 'bg-red-600';
    iconName = 'xCircle';
    title = `Data sync failed: ${error}. Items will remain queued.`;
  } else if (status === 'offline' && pendingItemsCount > 0) {
      statusText = `${pendingItemsCount} Pending`;
      bgColor = 'bg-orange-500';
      iconName = 'upload';
      title = `Offline. ${pendingItemsCount} items are waiting to sync.`;
  } else {
    switch (status) {
      case 'online':
        statusText = 'Live';
        bgColor = 'bg-green-500';
        iconName = 'checkCircle';
        title = 'Live connection. All changes are saved.';
        break;
      case 'offline':
        statusText = 'Offline';
        bgColor = 'bg-yellow-500';
        iconName = 'xCircle';
        title = 'Offline mode. Changes are saved locally and will sync when reconnected.';
        break;
      case 'connecting':
      default:
        statusText = 'Connecting';
        bgColor = 'bg-blue-500';
        iconName = 'clock';
        title = 'Establishing connection...';
        break;
    }
  }

  const icon = <Icon name={iconName} className={`w-3 h-3 ${status === 'connecting' ? 'animate-spin' : ''}`}/>;

  return (
    <div
        title={title} 
        className={`flex items-center gap-1.5 text-white text-xs font-semibold px-2 py-1 rounded-full ${bgColor} transition-colors`}
    >
      {icon}
      <span className="hidden sm:inline">{statusText}</span>
    </div>
  );
};
export default FirestoreSyncIndicator;