import { Injectable } from '@angular/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

@Injectable({ providedIn: 'root' })
export class HapticsService {
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async impact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    if (!this.enabled) return;
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    } as const;
    try {
      await Haptics.impact({ style: styleMap[style] });
    } catch {
      this.fallbackVibrate(style === 'light' ? 8 : style === 'medium' ? 16 : 28);
    }
  }

  async notify(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
    if (!this.enabled) return;
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    } as const;
    try {
      await Haptics.notification({ type: typeMap[type] });
    } catch {
      this.fallbackVibrate(type === 'error' ? [20, 40, 20] : type === 'warning' ? 24 : 14);
    }
  }

  private fallbackVibrate(pattern: number | number[]): void {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // Vibration is optional.
    }
  }
}
