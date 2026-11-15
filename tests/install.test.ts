import { describe, expect, it } from 'vitest';
import { decideInstallGuide, detectPlatform, parseInstallHint } from '../src/lib/install';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipadOS: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

describe('安裝引導：平台判斷', () => {
  it('iPhone、Android、桌機', () => {
    expect(detectPlatform(UA.iphone)).toBe('ios');
    expect(detectPlatform(UA.android)).toBe('android');
    expect(detectPlatform(UA.windows)).toBe('other');
  });

  it('iPadOS 偽裝成 Mac：有觸控才算 iOS', () => {
    expect(detectPlatform(UA.ipadOS, 5)).toBe('ios');
    expect(detectPlatform(UA.ipadOS, 0)).toBe('other');
  });

  it('讀 QR code 帶的 ?install= 參數', () => {
    expect(parseInstallHint('?install=android')).toBe('android');
    expect(parseInstallHint('?install=ios&x=1')).toBe('ios');
    expect(parseInstallHint('?install=windows')).toBeNull();
    expect(parseInstallHint('')).toBeNull();
  });
});

describe('安裝引導：要不要顯示', () => {
  const base = { standalone: false, hint: null, platform: 'other' as const, dismissed: false };

  it('已經從主畫面打開時一律不顯示（即使有參數）', () => {
    expect(decideInstallGuide({ ...base, standalone: true, hint: 'ios', platform: 'ios' })).toBeNull();
  });

  it('有 QR code 參數時以參數為準，即使按過「之後再說」或在桌機', () => {
    expect(decideInstallGuide({ ...base, hint: 'android', dismissed: true })).toBe('android');
    expect(decideInstallGuide({ ...base, hint: 'ios', platform: 'android' })).toBe('ios');
  });

  it('沒有參數：手機才顯示，按過「之後再說」就不顯示', () => {
    expect(decideInstallGuide({ ...base, platform: 'ios' })).toBe('ios');
    expect(decideInstallGuide({ ...base, platform: 'android' })).toBe('android');
    expect(decideInstallGuide({ ...base, platform: 'other' })).toBeNull();
    expect(decideInstallGuide({ ...base, platform: 'ios', dismissed: true })).toBeNull();
  });
});
