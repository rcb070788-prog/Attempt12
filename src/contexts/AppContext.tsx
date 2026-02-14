import React, { createContext, useContext, ReactNode } from 'react';

interface AppContextValue {
  user: any;
  profile: any;
  sessionHydrated: boolean;
  showToast: (message: string, type?: 'success' | 'error') => void;
  showSignupRequiredModal: (message: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AppContextValue;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return ctx;
}
