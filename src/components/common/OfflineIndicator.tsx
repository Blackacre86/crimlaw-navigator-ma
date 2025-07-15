import React, { useState, useEffect } from 'react';
import { AlertCircle, Wifi, WifiOff, RefreshCw, Database } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';
import { useToast } from '@/hooks/use-toast';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, isConnected } = useNetworkStatus();
  const { getAllQueries, syncQueries, isInitialized } = useOfflineStorage();
  const { toast } = useToast();
  const [savedCount, setSavedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update saved queries count
  useEffect(() => {
    if (isInitialized) {
      getAllQueries().then(queries => {
        setSavedCount(queries.length);
      }).catch(console.error);
    }
  }, [isInitialized, getAllQueries]);

  const handleSync = async () => {
    if (!isConnected) {
      toast({
        title: "No Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      await syncQueries();
      const queries = await getAllQueries();
      setSavedCount(queries.length);
      
      toast({
        title: "Sync Complete",
        description: "All saved queries have been synchronized.",
      });
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync saved queries. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show indicator if we're online and connected
  if (isOnline && isConnected) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container mx-auto px-4 py-2">
        <Alert className="border-warning bg-warning/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="h-4 w-4 text-warning" />
                ) : (
                  <WifiOff className="h-4 w-4 text-destructive" />
                )}
                <AlertCircle className="h-4 w-4" />
              </div>
              
              <AlertDescription className="flex items-center gap-2">
                <span>
                  {!isOnline 
                    ? "You're offline. Using cached data." 
                    : "Connection issues detected. Some features may be limited."
                  }
                </span>
                
                {savedCount > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {savedCount} saved {savedCount === 1 ? 'query' : 'queries'}
                  </Badge>
                )}
              </AlertDescription>
            </div>

            {isOnline && savedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={isSyncing || !isConnected}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            )}
          </div>
        </Alert>
      </div>
    </div>
  );
};