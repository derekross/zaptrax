import type { ValueBlock, ValueRecipient } from './podcastindex';

/**
 * Use a CORS proxy to fetch RSS feeds that don't have CORS headers.
 * Note: This routes through a third-party proxy for CORS workaround only.
 */
function getCorsProxiedUrl(feedUrl: string): string {
  return `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`;
}

/** Fetch RSS feed XML with CORS proxy fallback. */
async function fetchRSSFeed(feedUrl: string): Promise<Document | null> {
  try {
    // Try direct fetch first (will usually fail due to CORS)
    let response = await fetch(feedUrl).catch(() => null);

    // If direct fetch fails, try with CORS proxy fallback
    if (!response || !response.ok) {
      const proxiedUrl = getCorsProxiedUrl(feedUrl);
      response = await fetch(proxiedUrl);
    }

    if (!response.ok) {
      return null;
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      return null;
    }

    return xmlDoc;
  } catch {
    return null;
  }
}

/** Extract a ValueBlock from a given XML element. */
function extractValueBlock(parent: Element | Document): ValueBlock | null {
  const NS = 'https://podcastindex.org/namespace/1.0';

  let valueElements = parent.getElementsByTagNameNS(NS, 'value');
  if (valueElements.length === 0) {
    valueElements = parent.getElementsByTagName('value');
  }
  if (valueElements.length === 0) {
    return null;
  }

  const valueElement = valueElements[0];
  const type = valueElement.getAttribute('type') || 'lightning';
  const method = valueElement.getAttribute('method') || 'keysend';

  let recipientElements = valueElement.getElementsByTagNameNS(NS, 'valueRecipient');
  if (recipientElements.length === 0) {
    recipientElements = valueElement.getElementsByTagName('valueRecipient');
  }

  const recipients: ValueRecipient[] = [];
  for (const recipient of Array.from(recipientElements)) {
    const name = recipient.getAttribute('name') || undefined;
    const recipientType = recipient.getAttribute('type') as 'node' | 'address';
    const address = recipient.getAttribute('address');
    const split = parseInt(recipient.getAttribute('split') || '0');
    const customKey = recipient.getAttribute('customKey') || undefined;
    const customValue = recipient.getAttribute('customValue') || undefined;
    const fee = recipient.getAttribute('fee') === 'true';

    if (address && split > 0) {
      recipients.push({ name, type: recipientType, address, customKey, customValue, split, fee });
    }
  }

  if (recipients.length === 0) {
    return null;
  }

  const suggested = valueElement.getAttribute('suggested');

  return {
    type: type as 'lightning',
    method: method as 'keysend' | 'amp',
    suggested: suggested ? parseInt(suggested) : undefined,
    recipients,
  };
}

/**
 * Parse podcast:value block from RSS feed XML (channel-level).
 */
export async function parseRSSValueBlock(feedUrl: string): Promise<ValueBlock | null> {
  const xmlDoc = await fetchRSSFeed(feedUrl);
  if (!xmlDoc) return null;
  return extractValueBlock(xmlDoc);
}

/**
 * Parse podcast:value block for a specific episode (item-level override).
 * Falls back to channel-level value block if no episode-level block is found.
 */
export async function parseRSSEpisodeValueBlock(
  feedUrl: string,
  episodeGuid: string
): Promise<ValueBlock | null> {
  const xmlDoc = await fetchRSSFeed(feedUrl);
  if (!xmlDoc) return null;

  // Find the item with matching guid
  const items = xmlDoc.querySelectorAll('item');
  for (const item of Array.from(items)) {
    const guid = item.querySelector('guid');
    if (guid?.textContent === episodeGuid) {
      // Try item-level value block first
      const itemValue = extractValueBlock(item);
      if (itemValue) return itemValue;
      break;
    }
  }

  // Fall back to channel-level value block (no re-fetch needed)
  return extractValueBlock(xmlDoc);
}
