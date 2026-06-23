import { useState, useEffect } from 'react';
import { DashboardConfig } from '../types';

const DEFAULT_MEETING_TAB = 'meeting-notes';

type HistoryState = {
  page?: string;
  category?: string | null;
  poll?: unknown;
  dashboard?: DashboardConfig | null;
  documentsStack?: string[];
  activeMeetingTab?: string;
};

// The "Traffic Control" hook
export function useNavigation(user: any, selectedPoll: any, setSelectedPoll: (poll: any) => void) {
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#signup') return 'signup';
    return 'home';
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeDashboard, setActiveDashboard] = useState<DashboardConfig | null>(null);
  const [documentsStack, setDocumentsStack] = useState<string[]>([]);
  const [activeMeetingTab, setActiveMeetingTab] = useState(DEFAULT_MEETING_TAB);

  // 1. Reset to home if user logs out
  useEffect(() => {
    if (!user) {
      setCurrentPage('home');
      setSelectedPoll(null);
    }
  }, [user, setSelectedPoll]);

  // Reset documents stack when leaving Documents
  useEffect(() => {
    if (selectedCategory !== 'documents') {
      setDocumentsStack([]);
    }
  }, [selectedCategory]);

  // Reset meeting tab when leaving Meetings
  useEffect(() => {
    if (selectedCategory !== 'meetings') {
      setActiveMeetingTab(DEFAULT_MEETING_TAB);
    }
  }, [selectedCategory]);

  // 2. Handle the "Close Report" signal from Dashboard iframes
  useEffect(() => {
    const handleDashboardMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CLOSE_DASHBOARD') {
        setActiveDashboard(null);
      }
    };
    window.addEventListener('message', handleDashboardMessage);
    return () => window.removeEventListener('message', handleDashboardMessage);
  }, []);

  // 3. Handle Browser "Back" button (PopState)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (activeDashboard) {
        setActiveDashboard(null);
        window.history.pushState({
          page: 'home',
          category: null,
          poll: null,
          dashboard: null,
          documentsStack: [],
          activeMeetingTab: DEFAULT_MEETING_TAB,
        }, '');
        return;
      }

      const state = (event.state || {
        page: 'home',
        category: null,
        poll: null,
        dashboard: null,
        documentsStack: [],
        activeMeetingTab: DEFAULT_MEETING_TAB,
      }) as HistoryState;
      setCurrentPage(state.page || 'home');
      setSelectedCategory(state.category || null);
      setSelectedPoll(state.poll || null);
      setActiveDashboard(state.dashboard || null);
      setDocumentsStack(Array.isArray(state.documentsStack) ? state.documentsStack : []);
      setActiveMeetingTab(state.activeMeetingTab || DEFAULT_MEETING_TAB);
    };

    window.addEventListener('popstate', handlePopState);
    if (!window.history.state) {
      window.history.replaceState({
        page: currentPage,
        category: null,
        poll: null,
        dashboard: null,
        documentsStack: [],
        activeMeetingTab: DEFAULT_MEETING_TAB,
      }, '');
    }
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeDashboard, setSelectedPoll, currentPage]);

  // 4. Handle exiting fullscreen when dashboard closes
  useEffect(() => {
    if (!activeDashboard && document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    }
  }, [activeDashboard]);

  // 5. Sync the App State with the Browser URL/History
  useEffect(() => {
    const hState = window.history.state as HistoryState | null;
    const isDifferent = !hState ||
      hState.page !== currentPage ||
      hState.category !== selectedCategory ||
      (hState.poll && (hState.poll as { id?: string }).id !== selectedPoll?.id) ||
      (!hState.poll && selectedPoll) ||
      (hState.dashboard && hState.dashboard.id !== activeDashboard?.id) ||
      (!hState.dashboard && activeDashboard) ||
      (Array.isArray(hState.documentsStack) ? (hState.documentsStack.length !== documentsStack.length || hState.documentsStack.some((id: string, i: number) => id !== documentsStack[i])) : documentsStack.length > 0) ||
      (hState.activeMeetingTab ?? DEFAULT_MEETING_TAB) !== activeMeetingTab;

    if (isDifferent) {
      window.history.pushState({
        page: currentPage,
        category: selectedCategory,
        poll: selectedPoll,
        dashboard: activeDashboard,
        documentsStack,
        activeMeetingTab,
      }, '');
    }
  }, [currentPage, selectedCategory, selectedPoll, activeDashboard, documentsStack, activeMeetingTab]);

  return {
    currentPage, setCurrentPage,
    selectedCategory, setSelectedCategory,
    activeDashboard, setActiveDashboard,
    documentsStack, setDocumentsStack,
    activeMeetingTab, setActiveMeetingTab,
  };
}
