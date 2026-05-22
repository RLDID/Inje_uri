import * as amplitude from '@amplitude/analytics-browser';

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

let isInitialized = false;

function getAmplitudeApiKey(): string {
  return process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY?.trim() ?? '';
}

function canUseAnalytics(): boolean {
  return typeof window !== 'undefined' && getAmplitudeApiKey().length > 0;
}

export function initAnalytics(): boolean {
  if (!canUseAnalytics()) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  amplitude.init(getAmplitudeApiKey(), {
    autocapture: false,
  });
  isInitialized = true;
  return true;
}

export function trackEvent(eventName: string, properties: AnalyticsProperties = {}) {
  if (!initAnalytics()) {
    return;
  }

  amplitude.track(eventName, properties);
}

export function trackScreenView(properties: {
  screen: string;
  section: string;
  path: string;
  filter?: string | null;
}) {
  trackEvent('screen_viewed', properties);
}

export function trackTodayWooriHeartSent(properties: {
  candidateRank: number;
  matched: boolean;
  hadReceivedHeart: boolean;
}) {
  trackEvent('today_woori_heart_sent', properties);
}

export function trackNowWooriFeedCreated(properties: {
  categoryCount: number;
  imageCount: number;
  textLength: number;
}) {
  trackEvent('now_woori_feed_created', properties);
}

export function trackNowWooriHeartSent(properties: {
  source: 'feed_list' | 'feed_detail';
  hasMessage: boolean;
}) {
  trackEvent('now_woori_heart_sent', properties);
}

export function trackReceivedHeartAccepted(properties: {
  matched: boolean;
}) {
  trackEvent('received_heart_accepted', properties);
}

export function trackChatOpened(properties: {
  chatType?: string | null;
  chatStatus?: string | null;
  entrySection?: string | null;
  isExpired?: boolean;
}) {
  trackEvent('chat_opened', properties);
}
