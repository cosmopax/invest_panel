import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  selectedTimeRange: string;
  activeWireFilters: {
    categories: string[];
    minQuality: number;
    sentiment: string | null;
    assetId: string | null;
  };
  activeDeskTab: string;
  forumContextVisible: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTimeRange: (range: string) => void;
  setWireFilters: (filters: Partial<UIState["activeWireFilters"]>) => void;
  setDeskTab: (tab: string) => void;
  toggleForumContext: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  selectedTimeRange: "1M",
  activeWireFilters: {
    categories: [],
    minQuality: 5,
    sentiment: null,
    assetId: null,
  },
  activeDeskTab: "all",
  forumContextVisible: true,

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTimeRange: (range) => set({ selectedTimeRange: range }),
  setWireFilters: (filters) =>
    set((s) => ({
      activeWireFilters: { ...s.activeWireFilters, ...filters },
    })),
  setDeskTab: (tab) => set({ activeDeskTab: tab }),
  toggleForumContext: () =>
    set((s) => ({ forumContextVisible: !s.forumContextVisible })),
}));
