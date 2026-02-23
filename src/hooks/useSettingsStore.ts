import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BoardSize = 'small' | 'medium' | 'large';

interface SettingsStore {
    boardSize: BoardSize;
    showCoordinates: boolean;
    setBoardSize: (size: BoardSize) => void;
    setShowCoordinates: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
    persist(
        (set) => ({
            boardSize: 'medium',
            showCoordinates: false,
            setBoardSize: (size) => set({ boardSize: size }),
            setShowCoordinates: (show) => set({ showCoordinates: show }),
        }),
        {
            name: 'hexapath-settings',
        }
    )
);
