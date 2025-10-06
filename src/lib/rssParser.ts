import type { ValueBlock, ValueRecipient } from './podcastindex';

/**
 * Use a CORS proxy to fetch RSS feeds that don't have CORS headers
 */
function getCorsProxiedUrl(feedUrl: string): string {
  // Use allorigins.win CORS proxy
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
}

/**
 * Parse podcast:value block from RSS feed XML
 */
export async function parseRSSValueBlock(feedUrl: string): Promise<ValueBlock | null> {
  try {
    // Try direct fetch first
    let response = await fetch(feedUrl).catch(() => null);

    // If direct fetch fails, try with CORS proxy
    if (!response || !response.ok) {
      console.log('Direct RSS fetch failed, trying CORS proxy...');
      const proxiedUrl = getCorsProxiedUrl(feedUrl);
      response = await fetch(proxiedUrl);
    }

    if (!response.ok) {
      console.error('Failed to fetch RSS feed:', response.statusText);
      return null;
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parsing error:', parseError.textContent);
      return null;
    }

    // Look for podcast:value element (can be at channel or item level)
    // Need to use namespace-aware selector or getElementsByTagName
    let valueElements = xmlDoc.getElementsByTagNameNS('https://podcastindex.org/namespace/1.0', 'value');

    // Fallback to non-namespaced query if namespace query returns nothing
    if (valueElements.length === 0) {
      valueElements = xmlDoc.getElementsByTagName('value');
    }

    if (valueElements.length === 0) {
      return null;
    }

    // Use the first value element (typically at channel level)
    const valueElement = valueElements[0];

    const type = valueElement.getAttribute('type') || 'lightning';
    const method = valueElement.getAttribute('method') || 'keysend';

    // Parse recipients - use namespace-aware query
    let recipientElements = valueElement.getElementsByTagNameNS('https://podcastindex.org/namespace/1.0', 'valueRecipient');

    // Fallback to non-namespaced query
    if (recipientElements.length === 0) {
      recipientElements = valueElement.getElementsByTagName('valueRecipient');
    }

    const recipients: ValueRecipient[] = [];
    Array.from(recipientElements).forEach((recipient) => {

      const name = recipient.getAttribute('name') || undefined;
      const type = recipient.getAttribute('type') as 'node' | 'address';
      const address = recipient.getAttribute('address');
      const split = parseInt(recipient.getAttribute('split') || '0');
      const customKey = recipient.getAttribute('customKey') || undefined;
      const customValue = recipient.getAttribute('customValue') || undefined;
      const fee = recipient.getAttribute('fee') === 'true';

      if (address && split > 0) {
        recipients.push({
          name,
          type,
          address,
          customKey,
          customValue,
          split,
          fee,
        });
      }
    });

    if (recipients.length === 0) {
      return null;
    }

    // Get suggested amount if present
    const suggested = valueElement.getAttribute('suggested');

    return {
      type: type as 'lightning',
      method: method as 'keysend' | 'amp',
      suggested: suggested ? parseInt(suggested) : undefined,
      recipients,
    };
  } catch (error) {
    console.error('Error parsing RSS feed:', error);
    return null;
  }
}

/**
 * Parse podcast:value block for a specific episode (item-level override)
 */
export async function parseRSSEpisodeValueBlock(
  feedUrl: string,
  episodeGuid: string
): Promise<ValueBlock | null> {
  try {
    // Try direct fetch first
    let response = await fetch(feedUrl).catch(() => null);

    // If direct fetch fails, try with CORS proxy
    if (!response || !response.ok) {
      console.log('Direct RSS fetch failed, trying CORS proxy...');
      const proxiedUrl = getCorsProxiedUrl(feedUrl);
      response = await fetch(proxiedUrl);
    }

    if (!response.ok) {
      console.error('Failed to fetch RSS feed:', response.statusText);
      return null;
    }

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Check for parsing errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('XML parsing error:', parseError.textContent);
      return null;
    }

    // Find the item with matching guid
    const items = xmlDoc.querySelectorAll('item');
    let targetItem: Element | null = null;

    for (const item of Array.from(items)) {
      const guid = item.querySelector('guid');
      if (guid?.textContent === episodeGuid) {
        targetItem = item;
        break;
      }
    }

    if (!targetItem) {
      // Episode not found, fall back to channel-level value
      return parseRSSValueBlock(feedUrl);
    }

    // Look for podcast:value element in this specific item - use namespace-aware query
    let valueElements = targetItem.getElementsByTagNameNS('https://podcastindex.org/namespace/1.0', 'value');

    // Fallback to non-namespaced query
    if (valueElements.length === 0) {
      valueElements = targetItem.getElementsByTagName('value');
    }

    if (valueElements.length === 0) {
      // No item-level value, fall back to channel-level
      return parseRSSValueBlock(feedUrl);
    }

    const valueElement = valueElements[0];
    const type = valueElement.getAttribute('type') || 'lightning';
    const method = valueElement.getAttribute('method') || 'keysend';

    // Parse recipients - use namespace-aware query
    let recipientElements = valueElement.getElementsByTagNameNS('https://podcastindex.org/namespace/1.0', 'valueRecipient');

    // Fallback to non-namespaced query
    if (recipientElements.length === 0) {
      recipientElements = valueElement.getElementsByTagName('valueRecipient');
    }

    const recipients: ValueRecipient[] = [];
    Array.from(recipientElements).forEach((recipient) => {
      const name = recipient.getAttribute('name') || undefined;
      const type = recipient.getAttribute('type') as 'node' | 'address';
      const address = recipient.getAttribute('address');
      const split = parseInt(recipient.getAttribute('split') || '0');
      const customKey = recipient.getAttribute('customKey') || undefined;
      const customValue = recipient.getAttribute('customValue') || undefined;
      const fee = recipient.getAttribute('fee') === 'true';

      if (address && split > 0) {
        recipients.push({
          name,
          type,
          address,
          customKey,
          customValue,
          split,
          fee,
        });
      }
    });

    if (recipients.length === 0) {
      // No valid recipients in item-level value, fall back to channel-level
      return parseRSSValueBlock(feedUrl);
    }

    // Get suggested amount if present
    const suggested = valueElement.getAttribute('suggested');

    return {
      type: type as 'lightning',
      method: method as 'keysend' | 'amp',
      suggested: suggested ? parseInt(suggested) : undefined,
      recipients,
    };
  } catch (error) {
    console.error('Error parsing RSS episode value:', error);
    return null;
  }
}
