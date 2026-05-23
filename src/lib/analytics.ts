type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, properties: AnalyticsProperties = {}) {
  const cleanedProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean | null>;

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, cleanedProperties);
  }
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
