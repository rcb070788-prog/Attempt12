import React, { createContext, useContext, ReactNode } from 'react';

export interface FeaturesContextValue {
  polls: any[];
  setPolls: React.Dispatch<React.SetStateAction<any[]>>;
  fetchPolls: () => void;
  suggestions: any[];
  setSuggestions: React.Dispatch<React.SetStateAction<any[]>>;
  fetchSuggestions: () => void;
  boardMessages: any[];
  fetchBoardMessages: () => void;
  allUsers: any[];
  fetchUsers: () => void;
  manualRequests: any[];
  fetchManualRequests: () => void;
  adminMessages: any[];
  fetchAdminMessages: () => void;
  adminEmailDeletionVotes: any[];
  fetchAdminEmailDeletionVotes: () => void;
  deletionVotes: any[];
  fetchDeletionVotes: () => void;
  contactSubmissions: any[];
  fetchContactSubmissions: () => void;
  fetchAllData: () => void;
}

const FeaturesContext = createContext<FeaturesContextValue | null>(null);

export function FeaturesContextProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: FeaturesContextValue;
}) {
  return (
    <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>
  );
}

export function useFeaturesContext(): FeaturesContextValue {
  const ctx = useContext(FeaturesContext);
  if (!ctx) {
    throw new Error('useFeaturesContext must be used within FeaturesContextProvider');
  }
  return ctx;
}
