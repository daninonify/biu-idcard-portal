import { useCallback, useState } from 'react';

/**
 * Camera and capture preferences for THIS workstation. They live in the
 * browser (each capture desk has its own camera), not on the server.
 */
export type CameraSettings = {
    deviceId: string;
    resolution: '1080' | '720';
    mirror: boolean;
    timer: boolean;
    engine: 'mediapipe' | 'rembg';
    rembgModel: string;
    feather: number;
    tighten: number;
};

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
    deviceId: '',
    resolution: '1080',
    mirror: false,
    timer: false,
    engine: 'mediapipe',
    rembgModel: 'u2net_human_seg',
    feather: 1.5,
    tighten: 0.35,
};

const KEY = 'idcard-portal.camera-settings';

export function readCameraSettings(): CameraSettings {
    try {
        const raw = window.localStorage.getItem(KEY);

        return raw
            ? {
                  ...DEFAULT_CAMERA_SETTINGS,
                  ...(JSON.parse(raw) as Partial<CameraSettings>),
              }
            : DEFAULT_CAMERA_SETTINGS;
    } catch {
        return DEFAULT_CAMERA_SETTINGS;
    }
}

export function useCameraSettings(): [
    CameraSettings,
    (patch: Partial<CameraSettings>) => void,
    () => void,
] {
    const [settings, setSettings] =
        useState<CameraSettings>(readCameraSettings);

    const update = useCallback((patch: Partial<CameraSettings>) => {
        setSettings((s) => {
            const next = { ...s, ...patch };
            try {
                window.localStorage.setItem(KEY, JSON.stringify(next));
            } catch {
                /* private window: keep in memory only */
            }

            return next;
        });
    }, []);

    const reset = useCallback(() => {
        try {
            window.localStorage.removeItem(KEY);
        } catch {
            /* ignore */
        }
        setSettings(DEFAULT_CAMERA_SETTINGS);
    }, []);

    return [settings, update, reset];
}
