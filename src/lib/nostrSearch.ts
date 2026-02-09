import { nip19 } from 'nostr-tools';

export interface NostrSearchResult {
  type: 'npub' | 'nip05';
  pubkey: string;
  identifier: string;
  displayName?: string;
  verified?: boolean;
}

/**
 * Check if a string looks like an npub
 */
export function isNpub(input: string): boolean {
  return input.startsWith('npub1') && input.length === 63;
}

/**
 * Check if a string looks like a NIP-05 identifier
 */
export function isNip05(input: string): boolean {
  const nip05Regex = /^[a-z0-9-_.]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  return nip05Regex.test(input);
}

/**
 * Decode an npub to get the pubkey
 */
export function decodeNpub(npub: string): string | null {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
  } catch (error) {
    console.error('Failed to decode npub:', error);
  }
  return null;
}

/**
 * Resolve a NIP-05 identifier to get the pubkey
 */
export async function resolveNip05(identifier: string): Promise<string | null> {
  try {
    const [localPart, domain] = identifier.split('@');
    if (!localPart || !domain) return null;

    // Validate domain to prevent SSRF (no IP addresses, no ports, no path traversal)
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(domain)) {
      return null;
    }

    const url = `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(localPart)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.names && typeof data.names === 'object') {
      const pubkey = data.names[localPart];
      if (typeof pubkey === 'string' && pubkey.length === 64) {
        return pubkey;
      }
    }
  } catch (error) {
    console.error('Failed to resolve NIP-05:', error);
  }
  return null;
}

/**
 * Parse search input and return Nostr search results
 */
export async function parseNostrSearch(input: string): Promise<NostrSearchResult[]> {
  const results: NostrSearchResult[] = [];
  const trimmedInput = input.trim();

  // Check for npub
  if (isNpub(trimmedInput)) {
    const pubkey = decodeNpub(trimmedInput);
    if (pubkey) {
      results.push({
        type: 'npub',
        pubkey,
        identifier: trimmedInput,
      });
    }
  }

  // Check for NIP-05
  if (isNip05(trimmedInput)) {
    try {
      const pubkey = await resolveNip05(trimmedInput);
      if (pubkey) {
        results.push({
          type: 'nip05',
          pubkey,
          identifier: trimmedInput,
          verified: true,
        });
      } else {
        // Still add it as unverified for display purposes
        results.push({
          type: 'nip05',
          pubkey: '', // Will be empty for unverified
          identifier: trimmedInput,
          verified: false,
        });
      }
    } catch {
      // Add as unverified
      results.push({
        type: 'nip05',
        pubkey: '',
        identifier: trimmedInput,
        verified: false,
      });
    }
  }

  return results;
}

/**
 * Create an npub from a pubkey
 */
export function createNpub(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch (error) {
    console.error('Failed to encode npub:', error);
    return '';
  }
}