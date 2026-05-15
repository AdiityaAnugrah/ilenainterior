import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CeilingLightingConfig } from '../components/planner/three/ceiling-lighting/config';

export type ViewMode = '2d' | '3d' | 'walk';

export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface WallpaperData {
  id: number;
  name: string;
  price_per_meter: number;
  texture_pattern: string;
  color: string;
  thumbnail?: string;
}

export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
  roomType: string;
  wallColor: string;
  wallTexture?: string;
  floorMaterial: string;
  floorColor?: string;
  // Wallpaper per-dinding
  wallpapers?: Partial<Record<WallSide, WallpaperData | null>>;
  doorOffsetX?: number;    // cm dari tengah dinding selatan, + = kanan
  windowOffsetX?: number;  // cm dari tengah dinding utara, + = kanan
  ceilingColor?: string;
  ceilingLighting?: CeilingLightingConfig;
}

export interface PlacedItem {
  id: string;
  productId: number;
  variantId?: number;
  name: string;
  thumbnail: string;
  model3d?: string | null;
  price: number;
  category: string;
  position: { x: number; y: number };
  elevation: number;
  rotation: number;
  scale: number;
  dimensions: { width: number; depth: number; height: number };
  variantColor?: string;
}

interface EditorState {
  // ============================================================================
  // STATE ORGANIZATION
  // ============================================================================
  // State is organized by change frequency for optimal performance:
  // 
  // FREQUENTLY CHANGING (updated on every user interaction):
  // - selectedItemId: Changes on every item selection/deselection
  // - viewMode: Changes when switching between 2D/3D/walk modes
  // - timeOfDay: Changes when toggling day/night mode
  // 
  // OCCASIONALLY CHANGING (updated during editing):
  // - items: Changes when adding/removing/updating furniture
  // - history/historyIndex: Changes on undo/redo operations
  // 
  // RARELY CHANGING (set once or infrequently):
  // - roomConfig: Set during room configuration, rarely changes after
  // - projectId/projectName: Set when loading/creating project
  // - currentStep: Changes only during wizard navigation
  // ============================================================================

  // Frequently changing state
  selectedItemId: string | null;
  viewMode: ViewMode;
  timeOfDay: 'day' | 'night';

  // Occasionally changing state
  items: PlacedItem[];
  history: PlacedItem[][];
  historyIndex: number;

  // Rarely changing state
  projectId: number | null;
  projectName: string;
  roomConfig: RoomConfig;
  currentStep: number;

  // Actions
  setProjectId: (id: number) => void;
  setProjectName: (name: string) => void;
  setRoomConfig: (config: Partial<RoomConfig>) => void;
  setViewMode: (mode: ViewMode) => void;
  setTimeOfDay: (t: 'day' | 'night') => void;
  setCurrentStep: (step: number) => void;
  setSelectedItem: (id: string | null) => void;

  addItem: (item: PlacedItem) => void;
  updateItem: (id: string, updates: Partial<PlacedItem>) => void;
  removeItem: (id: string) => void;

  // Wallpaper
  setWallpaper: (side: WallSide, wallpaper: WallpaperData | null) => void;

  undo: () => void;
  redo: () => void;

  loadProject: (id: number, name: string, config: Partial<RoomConfig>, items: PlacedItem[]) => void;
  totalFurniturePrice: () => number;
  totalWallpaperPrice: () => number;
  totalPrice: () => number;
  reset: () => void;
}

const DEFAULT_ROOM: RoomConfig = {
  width: 5,
  depth: 4,
  height: 3,
  roomType: 'ruang_tamu',
  wallColor: '#F5F5F0',
  floorMaterial: 'marmer',
  floorColor: '#C8C8C8',
  wallpapers: {},
  ceilingColor: '#FAFAF9',
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
  // Frequently changing state
  selectedItemId: null,
  viewMode: '2d',
  timeOfDay: 'day' as const,

  // Occasionally changing state
  items: [],
  history: [[]],
  historyIndex: 0,

  // Rarely changing state
  projectId: null,
  projectName: 'Proyek Baru',
  roomConfig: DEFAULT_ROOM,
  currentStep: 1,

  setProjectId: (id) => set({ projectId: id }),
  setProjectName: (name) => set({ projectName: name }),
  setRoomConfig: (config) => set((s) => ({ roomConfig: { ...s.roomConfig, ...config } })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setSelectedItem: (id) => set({ selectedItemId: id }),

  addItem: (item) => {
    const { items, history, historyIndex } = get();
    const newItems = [...items, item];
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItems);
    set({ items: newItems, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  updateItem: (id, updates) => {
    const { items, history, historyIndex } = get();
    const newItems = items.map((i) => (i.id === id ? { ...i, ...updates } : i));
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItems);
    set({ items: newItems, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  removeItem: (id) => {
    const { items, history, historyIndex } = get();
    const newItems = items.filter((i) => i.id !== id);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newItems);
    set({ items: newItems, selectedItemId: null, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  setWallpaper: (side, wallpaper) => {
    set((s) => ({
      roomConfig: {
        ...s.roomConfig,
        wallpapers: {
          ...s.roomConfig.wallpapers,
          [side]: wallpaper,
        },
      },
    }));
  },

  loadProject: (id, name, config, items) => {
    const newHistory = [items];
    set({
      projectId: id,
      projectName: name,
      roomConfig: { ...DEFAULT_ROOM, ...config },
      items,
      selectedItemId: null,
      viewMode: '2d',
      currentStep: 3,
      history: newHistory,
      historyIndex: 0,
    });
  },

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set({ items: history[newIndex], historyIndex: newIndex });
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set({ items: history[newIndex], historyIndex: newIndex });
    }
  },

  totalFurniturePrice: () =>
    get().items.reduce((sum, i) => sum + (Number(i.price) || 0), 0),

  totalWallpaperPrice: () => {
    const { roomConfig } = get();
    const wp = roomConfig.wallpapers ?? {};
    const W = Number(roomConfig.width)  || 0;
    const D = Number(roomConfig.depth)  || 0;
    const wallLengths: Record<WallSide, number> = {
      north: W, south: W, east: D, west: D,
    };
    let total = 0;
    for (const side of Object.keys(wp) as WallSide[]) {
      const w = wp[side];
      if (w) total += (Number(w.price_per_meter) || 0) * wallLengths[side];
    }
    return total;
  },

  totalPrice: () => get().totalFurniturePrice() + get().totalWallpaperPrice(),

  reset: () =>
    set({
      projectId: null,
      projectName: 'Proyek Baru',
      roomConfig: DEFAULT_ROOM,
      items: [],
      selectedItemId: null,
      viewMode: '2d',
      timeOfDay: 'day',
      currentStep: 1,
      history: [[]],
      historyIndex: 0,
    }),
}),
    {
      name: 'ilena-editor',
      partialize: (state) => ({
        roomConfig:   state.roomConfig,
        items:        state.items,
        currentStep:  state.currentStep,
        projectId:    state.projectId,
        projectName:  state.projectName,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.history      = [state.items];
          state.historyIndex = 0;
          state.selectedItemId = null;
        }
      },
    }
  )
);

// ============================================================================
// OPTIMIZED SELECTORS
// ============================================================================
// These selectors provide granular access to store state, preventing
// unnecessary re-renders by only subscribing to specific slices of state.
// Use these selectors instead of accessing the entire store.
//
// PERFORMANCE BENEFITS:
// - Components only re-render when their specific data changes
// - Shallow comparison prevents re-renders for unchanged objects/arrays
// - Memoized selectors return stable references when data hasn't changed
//
// USAGE EXAMPLES:
// 
// BAD (causes re-render on ANY store change):
//   const store = useEditorStore();
//   const items = store.items;
//
// GOOD (only re-renders when items array changes):
//   const items = useEditorStore(selectItems);
//
// GOOD (only re-renders when selectedItemId changes):
//   const selectedItemId = useEditorStore(selectSelectedItemId);
// ============================================================================

// Frequently changing selectors (updated on every user interaction)
export const selectSelectedItemId = (state: EditorState) => state.selectedItemId;
export const selectViewMode = (state: EditorState) => state.viewMode;
export const selectTimeOfDay = (state: EditorState) => state.timeOfDay;

// Occasionally changing selectors (updated during editing)
export const selectItems = (state: EditorState) => state.items;
export const selectItemsCount = (state: EditorState) => state.items.length;
export const selectHistory = (state: EditorState) => state.history;
export const selectHistoryIndex = (state: EditorState) => state.historyIndex;
export const selectCanUndo = (state: EditorState) => state.historyIndex > 0;
export const selectCanRedo = (state: EditorState) => state.historyIndex < state.history.length - 1;

// Rarely changing selectors (set once or infrequently)
export const selectProjectId = (state: EditorState) => state.projectId;
export const selectProjectName = (state: EditorState) => state.projectName;
export const selectRoomConfig = (state: EditorState) => state.roomConfig;
export const selectCurrentStep = (state: EditorState) => state.currentStep;

// Granular room config selectors (prevent re-renders when other room properties change)
export const selectRoomDimensions = (state: EditorState) => ({
  width: state.roomConfig.width,
  depth: state.roomConfig.depth,
  height: state.roomConfig.height,
});
export const selectRoomWidth = (state: EditorState) => state.roomConfig.width;
export const selectRoomDepth = (state: EditorState) => state.roomConfig.depth;
export const selectRoomHeight = (state: EditorState) => state.roomConfig.height;
export const selectRoomType = (state: EditorState) => state.roomConfig.roomType;
export const selectWallColor = (state: EditorState) => state.roomConfig.wallColor;
export const selectFloorMaterial = (state: EditorState) => state.roomConfig.floorMaterial;
export const selectFloorColor = (state: EditorState) => state.roomConfig.floorColor;
export const selectWallpapers = (state: EditorState) => state.roomConfig.wallpapers;
export const selectDoorOffsetX = (state: EditorState) => state.roomConfig.doorOffsetX;
export const selectWindowOffsetX = (state: EditorState) => state.roomConfig.windowOffsetX;
export const selectCeilingColor = (state: EditorState) => state.roomConfig.ceilingColor;
export const selectCeilingLighting = (state: EditorState) => state.roomConfig.ceilingLighting;

// Computed selectors (derive data from state)
export const selectSelectedItem = (state: EditorState) => 
  state.items.find((i) => i.id === state.selectedItemId) ?? null;

export const selectItemById = (id: string) => (state: EditorState) =>
  state.items.find((i) => i.id === id) ?? null;

export const selectItemsByCategory = (category: string) => (state: EditorState) =>
  state.items.filter((i) => i.category === category);

// Price selectors
export const selectTotalFurniturePrice = (state: EditorState) => 
  state.totalFurniturePrice();

export const selectTotalWallpaperPrice = (state: EditorState) => 
  state.totalWallpaperPrice();

export const selectTotalPrice = (state: EditorState) => 
  state.totalPrice();

// Action selectors (for components that only need actions, not state)
export const selectActions = (state: EditorState) => ({
  setProjectId: state.setProjectId,
  setProjectName: state.setProjectName,
  setRoomConfig: state.setRoomConfig,
  setViewMode: state.setViewMode,
  setTimeOfDay: state.setTimeOfDay,
  setCurrentStep: state.setCurrentStep,
  setSelectedItem: state.setSelectedItem,
  addItem: state.addItem,
  updateItem: state.updateItem,
  removeItem: state.removeItem,
  setWallpaper: state.setWallpaper,
  undo: state.undo,
  redo: state.redo,
  loadProject: state.loadProject,
  reset: state.reset,
});

// Combined selectors for common use cases
export const selectEditorContext = (state: EditorState) => ({
  items: state.items,
  selectedItemId: state.selectedItemId,
  roomConfig: state.roomConfig,
  viewMode: state.viewMode,
});

export const selectProjectContext = (state: EditorState) => ({
  projectId: state.projectId,
  projectName: state.projectName,
  currentStep: state.currentStep,
});

export const selectHistoryContext = (state: EditorState) => ({
  canUndo: state.historyIndex > 0,
  canRedo: state.historyIndex < state.history.length - 1,
  undo: state.undo,
  redo: state.redo,
});
