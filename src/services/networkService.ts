import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export interface AppNetworkStatus {
  connected: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
  isNative: boolean;
}

type NetworkListener = (status: AppNetworkStatus) => void;

class NetworkService {
  private listeners: Set<NetworkListener> = new Set();
  private currentStatus: AppNetworkStatus = {
    connected: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
    isNative: Capacitor.isNativePlatform()
  };

  constructor() {
    this.init();
  }

  private async init() {
    const isNative = Capacitor.isNativePlatform();
    this.currentStatus.isNative = isNative;

    if (isNative) {
      try {
        const status = await Network.getStatus();
        this.currentStatus = {
          connected: status.connected,
          connectionType: (status.connectionType as AppNetworkStatus['connectionType']) || 'unknown',
          isNative: true
        };

        Network.addListener('networkStatusChange', (status) => {
          console.log('[NetworkService Native] Status changed:', status);
          this.currentStatus = {
            connected: status.connected,
            connectionType: (status.connectionType as AppNetworkStatus['connectionType']) || 'unknown',
            isNative: true
          };
          this.notifyListeners();
        });
      } catch (err) {
        console.warn('[NetworkService] Failed to initialize native network listener, falling back to web:', err);
        this.setupWebListeners();
      }
    } else {
      this.setupWebListeners();
    }
  }

  private setupWebListeners() {
    if (typeof window === 'undefined') return;

    this.currentStatus.connected = navigator.onLine;

    window.addEventListener('online', () => {
      console.log('[NetworkService Web] Browser transitioned to ONLINE');
      this.currentStatus = {
        connected: true,
        connectionType: 'wifi',
        isNative: false
      };
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      console.log('[NetworkService Web] Browser transitioned to OFFLINE');
      this.currentStatus = {
        connected: false,
        connectionType: 'none',
        isNative: false
      };
      this.notifyListeners();
    });
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.currentStatus);
      } catch (err) {
        console.error('[NetworkService] Error in listener callback:', err);
      }
    }
  }

  public getStatus(): AppNetworkStatus {
    return { ...this.currentStatus };
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Emit current status immediately upon subscribing
    listener(this.currentStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * For testing or manual simulation of online/offline toggle in UI
   */
  public simulateStatus(connected: boolean) {
    this.currentStatus.connected = connected;
    this.currentStatus.connectionType = connected ? 'wifi' : 'none';
    this.notifyListeners();
  }
}

export const networkService = new NetworkService();
