import { useEffect, useState } from 'react';
import { pythonAPI } from '@/lib/python-api';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle } from 'lucide-react';

export function BackendStatus() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await pythonAPI.checkHealth();
      setIsHealthy(healthy);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isHealthy === null) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Activity className="h-3 w-3 animate-pulse" />
        Checking...
      </Badge>
    );
  }

  return (
    <Badge variant={isHealthy ? "default" : "destructive"} className="gap-1">
      {isHealthy ? (
        <Activity className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      Python Backend: {isHealthy ? "Connected" : "Disconnected"}
    </Badge>
  );
}