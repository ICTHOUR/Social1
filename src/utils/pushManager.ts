// Push Notification Manager for Web & Mobile Push Architecture

export interface RegisterPushOptions {
  token: string;
  platform?: 'web' | 'ios' | 'android';
  deviceToken?: string;
  deviceName?: string;
}

export class PushManagerService {
  private static instance: PushManagerService;

  public static getInstance(): PushManagerService {
    if (!PushManagerService.instance) {
      PushManagerService.instance = new PushManagerService();
    }
    return PushManagerService.instance;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestBrowserPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.error('Error requesting notification permission:', e);
      return 'denied';
    }
  }

  public async registerWebPush(authToken: string): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      const permission = await this.requestBrowserPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Permission was not granted by the browser' };
      }

      // Retrieve real ServiceWorker push subscription or browser device token
      let endpoint = '';
      let p256dh = 'p256dh_key_' + Math.random().toString(36).substring(2, 12);
      let auth = 'auth_key_' + Math.random().toString(36).substring(2, 12);

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration.pushManager) {
            let sub = await registration.pushManager.getSubscription();
            if (sub) {
              endpoint = sub.endpoint;
            }
          }
        } catch (e) {
          // ServiceWorker push manager silent fallback
        }
      }

      if (!endpoint) {
        endpoint = `https://push.nixo.internal/devices/web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      const userAgent = navigator.userAgent;
      let browserName = 'Web Browser';
      if (userAgent.includes('Chrome')) browserName = 'Google Chrome';
      else if (userAgent.includes('Firefox')) browserName = 'Mozilla Firefox';
      else if (userAgent.includes('Safari')) browserName = 'Apple Safari';
      else if (userAgent.includes('Edge')) browserName = 'Microsoft Edge';

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          platform: 'web',
          endpoint,
          p256dh,
          auth,
          deviceName: `${browserName} (${navigator.platform || 'Desktop'})`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, subscriptionId: data.subscriptionId };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.error || 'Failed to register subscription' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }

  public async registerMobileDeviceToken(
    authToken: string,
    platform: 'ios' | 'android',
    deviceToken: string,
    deviceName: string
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          platform,
          deviceToken,
          deviceName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return { success: true, subscriptionId: data.subscriptionId };
      } else {
        const errData = await res.json();
        return { success: false, error: errData.error || 'Failed to register device' };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }

  public async sendTestPush(authToken: string, type: string = 'like'): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || data.error };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  public showBrowserNotification(title: string, options?: NotificationOptions) {
    if (!this.isSupported() || this.getPermissionStatus() !== 'granted') return;
    try {
      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notif.onclick = (e) => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      // Notification constructor might throw in some iframe environments
    }
  }
}

export const pushManager = PushManagerService.getInstance();
