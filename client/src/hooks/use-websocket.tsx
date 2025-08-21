import { useEffect } from 'react';
import { websocket } from '@/lib/websocket';
import { useAuth } from './use-auth';

export function useWebSocket() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      websocket.connect();
    } else {
      websocket.disconnect();
    }

    return () => {
      websocket.disconnect();
    };
  }, [isAuthenticated]);

  return {
    on: websocket.on.bind(websocket),
    off: websocket.off.bind(websocket),
    send: websocket.send.bind(websocket),
  };
}
