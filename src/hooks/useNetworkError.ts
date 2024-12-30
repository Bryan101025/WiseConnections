// src/hooks/useNetworkError.ts
import { useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

export const useNetworkError = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkNetwork = useCallback(async () => {
    const state = await NetInfo.fetch();
    setIsOnline(!!state.isConnected);
    return !!state.isConnected;
  }, []);

  const handleError = useCallback(async (error: any) => {
    const isConnected = await checkNetwork();
    
    if (!isConnected) {
      setError('No internet connection. Please check your network and try again.');
      return true;
    }

    if (error?.message?.includes('network')) {
      setError('Network error. Please try again.');
      return true;
    }

    setError(error?.message || 'An unexpected error occurred');
    return false;
  }, [checkNetwork]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isOnline,
    error,
    handleError,
    clearError,
    checkNetwork,
  };
};
