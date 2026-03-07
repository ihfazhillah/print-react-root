import { useState, useEffect, useRef, useCallback } from 'react';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import type { UpdateInfo, DownloadState } from '../types/update';

const GITHUB_API_TAGS_URL = 'https://api.github.com/repos/ihfazhillah/print-react-root/tags';
const GITHUB_DOWNLOAD_BASE = 'https://github.com/ihfazhillah/print-react-root/releases/download';
const APK_FILENAME = 'app-release.apk';
const VERSION_PATTERN = /^v(\d+\.\d+\.\d+)$/;

/**
 * Compare two semver strings (X.Y.Z). Returns true if remote > local.
 */
function isNewerVersion(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

/**
 * Find the latest version tag from the list of extracted versions.
 */
function findLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  return versions.reduce((latest, v) => (isNewerVersion(v, latest) ? v : latest));
}

export function useUpdateCheck() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>({
    status: 'idle',
    progress: 0,
    error: null,
  });
  const [checking, setChecking] = useState(false);
  const downloadResumable = useRef<FileSystem.DownloadResumable | null>(null);
  const apkPath = useRef<string | null>(null);

  const checkForUpdate = useCallback(async (): Promise<UpdateInfo | null> => {
    setChecking(true);
    try {
      const response = await fetch(GITHUB_API_TAGS_URL);
      if (!response.ok) {
        setChecking(false);
        return null;
      }
      const tags: { name: string }[] = await response.json();

      const versions: string[] = [];
      for (const tag of tags) {
        const match = VERSION_PATTERN.exec(tag.name);
        if (match) versions.push(match[1]);
      }

      const latestVersion = findLatestVersion(versions);
      const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

      if (latestVersion && isNewerVersion(latestVersion, currentVersion)) {
        const info: UpdateInfo = {
          latestVersion,
          currentVersion,
          isUpdateAvailable: true,
          downloadUrl: `${GITHUB_DOWNLOAD_BASE}/v${latestVersion}/${APK_FILENAME}`,
        };
        setUpdateInfo(info);
        setDownloadState({ status: 'available', progress: 0, error: null });
        setChecking(false);
        return info;
      }

      const info: UpdateInfo = {
        latestVersion: latestVersion ?? currentVersion,
        currentVersion,
        isUpdateAvailable: false,
        downloadUrl: null,
      };
      setUpdateInfo(info);
      setDownloadState({ status: 'idle', progress: 0, error: null });
      setChecking(false);
      return info;
    } catch {
      // Offline or error — silently skip
      setChecking(false);
      return null;
    }
  }, []);

  const startDownload = useCallback(async () => {
    if (!updateInfo?.downloadUrl) return;

    const filePath = `${FileSystem.cacheDirectory}${APK_FILENAME}`;
    apkPath.current = filePath;
    setDownloadState({ status: 'downloading', progress: 0, error: null });

    try {
      const resumable = FileSystem.createDownloadResumable(
        updateInfo.downloadUrl,
        filePath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesExpectedToWrite > 0
              ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
              : 0;
          setDownloadState((prev) => ({ ...prev, progress }));
        },
      );
      downloadResumable.current = resumable;

      const result = await resumable.downloadAsync();
      if (result?.uri) {
        setDownloadState({ status: 'ready', progress: 1, error: null });
      } else {
        setDownloadState({ status: 'error', progress: 0, error: 'Download failed' });
      }
    } catch (err) {
      // If cancelled, cancelDownload already set state to 'available'
      setDownloadState((prev) => {
        if (prev.status !== 'downloading') return prev;
        return {
          status: 'error',
          progress: 0,
          error: err instanceof Error ? err.message : 'Download failed',
        };
      });
    } finally {
      downloadResumable.current = null;
    }
  }, [updateInfo]);

  const cancelDownload = useCallback(async () => {
    try {
      await downloadResumable.current?.pauseAsync();
    } catch {
      // ignore
    }
    downloadResumable.current = null;
    setDownloadState({ status: 'available', progress: 0, error: null });

    // Clean up partial file
    if (apkPath.current) {
      try {
        await FileSystem.deleteAsync(apkPath.current, { idempotent: true });
      } catch {
        // ignore
      }
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!apkPath.current) return;

    try {
      const contentUri = await FileSystem.getContentUriAsync(apkPath.current);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      });

      // Clean up cached APK after triggering install
      try {
        await FileSystem.deleteAsync(apkPath.current, { idempotent: true });
      } catch {
        // ignore
      }
    } catch {
      // If install fails, guide user to enable unknown sources
      try {
        await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
          data: 'package:com.kmkraft.printreact',
        });
      } catch {
        setDownloadState({
          status: 'error',
          progress: 0,
          error: 'Could not start installer. Please enable "Install unknown apps" in Settings.',
        });
      }
    }
  }, []);

  // Auto-check on mount
  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  return {
    updateInfo,
    downloadState,
    checking,
    checkForUpdate,
    startDownload,
    cancelDownload,
    installUpdate,
  };
}
