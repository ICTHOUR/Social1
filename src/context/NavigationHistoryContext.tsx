import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface NavigationState {
  tab: string;
  profileUserId: string | null;
  targetChatPartnerId: string | null;
  step: number;
}

interface NavigationContextType {
  activeTab: string;
  selectedProfileUserId: string | null;
  targetChatPartnerId: string | null;
  canGoBack: boolean;
  navigateTo: (tab: string, options?: { profileUserId?: string | null; partnerId?: string | null; replace?: boolean }) => void;
  navigateToProfile: (profileId?: string | null) => void;
  navigateToChat: (partnerId?: string | null) => void;
  goBack: () => boolean;
  registerModal: (id: string, closeFn: () => void) => () => void;
  isAnyModalOpen: boolean;
  getSavedScrollPosition: (tab: string) => number;
  restoreScrollPosition: (tab: string) => void;
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);
  const [targetChatPartnerId, setTargetChatPartnerId] = useState<string | null>(null);
  const [historyDepth, setHistoryDepth] = useState<number>(0);

  // Exact scroll restoration map (records scrollY for each view so back navigation stays exactly in place)
  const scrollPositionsRef = useRef<Map<string, number>>(new Map([['home', 0]]));
  const isRestoringScrollRef = useRef<boolean>(false);

  // Registry of open modals or overlay drawers. Key is modal id, value is close callback
  const openModalsRef = useRef<Map<string, () => void>>(new Map());
  const [openModalCount, setOpenModalCount] = useState<number>(0);

  const registerModal = useCallback((id: string, closeFn: () => void) => {
    openModalsRef.current.set(id, closeFn);
    setOpenModalCount(openModalsRef.current.size);

    // Push a lightweight history entry so Android phone back button closes this modal first
    try {
      const currentStep = window.history.state?.step || 0;
      window.history.pushState(
        {
          nixNav: true,
          type: 'modal',
          modalId: id,
          step: currentStep + 1,
        },
        ''
      );
    } catch (e) {
      console.warn('Failed to push modal state:', e);
    }

    return () => {
      openModalsRef.current.delete(id);
      setOpenModalCount(openModalsRef.current.size);
    };
  }, []);

  // Initialize browser history entry and disable browser auto-scroll on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Enforce manual scroll restoration so browser does not execute delayed jerky auto-scrolls
    if ('scrollRestoration' in window.history) {
      try {
        window.history.scrollRestoration = 'manual';
      } catch (e) {}
    }

    if (!window.history.state || !window.history.state.nixNav) {
      window.history.replaceState(
        {
          nixNav: true,
          tab: 'home',
          profileUserId: null,
          targetChatPartnerId: null,
          step: 0,
        },
        ''
      );
    } else {
      // Restore initial state if page was refreshed on a sub-view
      const s = window.history.state;
      if (s.tab) setActiveTab(s.tab);
      if (s.profileUserId) setSelectedProfileUserId(s.profileUserId);
      if (s.targetChatPartnerId) setTargetChatPartnerId(s.targetChatPartnerId);
      if (typeof s.step === 'number') setHistoryDepth(s.step);
    }
  }, []);

  // Real-time continuous scroll tracking for active tab (especially home feed)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleWindowScroll = () => {
      if (isRestoringScrollRef.current) return;
      if (activeTab) {
        // Record non-zero scroll or valid scroll position
        const currentY = window.scrollY;
        if (currentY > 0 || !scrollPositionsRef.current.has(activeTab)) {
          scrollPositionsRef.current.set(activeTab, currentY);
        }
      }
    };
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleWindowScroll);
  }, [activeTab]);

  const getSavedScrollPosition = useCallback((tab: string): number => {
    return scrollPositionsRef.current.get(tab) ?? 0;
  }, []);

  const restoreScrollPosition = useCallback((targetTab: string) => {
    if (typeof window === 'undefined') return;
    const savedScrollY = scrollPositionsRef.current.get(targetTab) ?? 0;
    
    // Explicitly guarantee instant scroll without any browser animation
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';

    isRestoringScrollRef.current = true;

    const performScroll = () => {
      window.scrollTo({ top: savedScrollY, behavior: 'instant' });
    };

    performScroll();
    requestAnimationFrame(() => {
      performScroll();
      requestAnimationFrame(() => {
        performScroll();
        setTimeout(performScroll, 25);
        setTimeout(performScroll, 75);
        setTimeout(() => {
          performScroll();
          isRestoringScrollRef.current = false;
        }, 180);
      });
    });
  }, []);

  // Synchronize with Android Hardware/Software Back Button (popstate event)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      // 1. If any modal is open, dismiss the most recently registered modal
      if (openModalsRef.current.size > 0) {
        const modalEntries = Array.from(openModalsRef.current.entries());
        const [lastId, closeFn] = modalEntries[modalEntries.length - 1];
        try {
          closeFn();
        } catch (err) {
          console.error('Error closing modal on back:', err);
        }
        openModalsRef.current.delete(lastId);
        setOpenModalCount(openModalsRef.current.size);
        return;
      }

      // 2. Read the popped history state
      const state = event.state;
      const targetTab = state?.tab || 'home';
      const targetProfileId = state?.profileUserId || null;
      const targetPartnerId = state?.targetChatPartnerId || null;
      const targetStep = typeof state?.step === 'number' ? state.step : 0;

      setActiveTab(targetTab);
      setSelectedProfileUserId(targetProfileId);
      setTargetChatPartnerId(targetPartnerId);
      setHistoryDepth(targetStep);

      // 3. Exact Instant Scroll Restoration: Instantly restore position to the exact scroll offset without smooth animation from top
      restoreScrollPosition(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [restoreScrollPosition]);

  // Navigate to a new tab/sub-screen with history push
  const navigateTo = useCallback(
    (
      tab: string,
      options?: { profileUserId?: string | null; partnerId?: string | null; replace?: boolean }
    ) => {
      const nextProfileId = options?.profileUserId !== undefined ? options.profileUserId : (tab === 'profile' ? selectedProfileUserId : null);
      const nextPartnerId = options?.partnerId !== undefined ? options.partnerId : null;

      // Avoid pushing redundant state if already on identical screen
      if (
        tab === activeTab &&
        nextProfileId === selectedProfileUserId &&
        nextPartnerId === targetChatPartnerId
      ) {
        return;
      }

      // Record current scroll position of the leaving tab BEFORE navigating away
      if (typeof window !== 'undefined') {
        scrollPositionsRef.current.set(activeTab, window.scrollY);
      }

      const currentStep = window.history.state?.step || 0;
      const nextStep = options?.replace ? currentStep : currentStep + 1;

      const stateObj: NavigationState = {
        tab,
        profileUserId: nextProfileId,
        targetChatPartnerId: nextPartnerId,
        step: nextStep,
      };

      try {
        if (options?.replace) {
          window.history.replaceState({ nixNav: true, ...stateObj }, '');
        } else {
          window.history.pushState({ nixNav: true, ...stateObj }, '');
        }
      } catch (e) {
        console.warn('Navigation history push failed:', e);
      }

      setActiveTab(tab);
      setSelectedProfileUserId(nextProfileId);
      setTargetChatPartnerId(nextPartnerId);
      setHistoryDepth(nextStep);

      // If moving forward to a sub-view (like profile or messenger), start at top cleanly without smooth scroll animation
      // If returning to home, restore saved scroll position
      if (tab === 'home') {
        const savedY = scrollPositionsRef.current.get('home') ?? 0;
        requestAnimationFrame(() => {
          window.scrollTo({ top: savedY, behavior: 'instant' });
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    },
    [activeTab, selectedProfileUserId, targetChatPartnerId]
  );

  const navigateToProfile = useCallback(
    (profileId?: string | null) => {
      navigateTo('profile', { profileUserId: profileId || null });
    },
    [navigateTo]
  );

  const navigateToChat = useCallback(
    (partnerId?: string | null) => {
      navigateTo('messenger', { partnerId: partnerId || null });
    },
    [navigateTo]
  );

  // Programmatic Back function (Used by on-screen Back button, gestures, and swipe navigation)
  const goBack = useCallback((): boolean => {
    // 1. If any modal is registered open, close it
    if (openModalsRef.current.size > 0) {
      const modalEntries = Array.from(openModalsRef.current.entries());
      const [lastId, closeFn] = modalEntries[modalEntries.length - 1];
      try {
        closeFn();
      } catch (err) {
        console.error('Error closing modal:', err);
      }
      openModalsRef.current.delete(lastId);
      setOpenModalCount(openModalsRef.current.size);

      // Also pop the corresponding history entry if pushed
      if (window.history.state?.type === 'modal') {
        window.history.back();
      }
      return true;
    }

    // 2. If browser has history steps in this app session, call window.history.back()
    const currentStep = window.history.state?.step || historyDepth;
    if (currentStep > 0) {
      window.history.back();
      return true;
    }

    // 3. If currently not on Home, return directly to Home
    if (activeTab !== 'home' || selectedProfileUserId !== null) {
      navigateTo('home', { replace: true });
      return true;
    }

    return false;
  }, [historyDepth, activeTab, selectedProfileUserId, navigateTo]);

  const canGoBack =
    openModalCount > 0 ||
    historyDepth > 0 ||
    activeTab !== 'home' ||
    selectedProfileUserId !== null;

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        selectedProfileUserId,
        targetChatPartnerId,
        canGoBack,
        navigateTo,
        navigateToProfile,
        navigateToChat,
        goBack,
        registerModal,
        isAnyModalOpen: openModalCount > 0,
        getSavedScrollPosition,
        restoreScrollPosition,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
