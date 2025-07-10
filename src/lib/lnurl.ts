import { bech32 } from 'bech32';

// LNURL-pay utilities
export interface LNURLPayResponse {
  callback: string;
  maxSendable: number;
  minSendable: number;
  metadata: string;
  tag: 'payRequest';
  commentAllowed?: number;
  payerData?: {
    name?: { mandatory: boolean };
    pubkey?: { mandatory: boolean };
    identifier?: { mandatory: boolean };
    email?: { mandatory: boolean };
    auth?: { mandatory: boolean; k1: string };
  };
}

export interface LNURLPayCallbackResponse {
  pr: string; // Lightning payment request (invoice)
  successAction?: {
    tag: 'message' | 'url' | 'aes';
    message?: string;
    url?: string;
    description?: string;
    ciphertext?: string;
    iv?: string;
  };
  disposable?: boolean;
  routes?: unknown[];
}

export async function decodeLNURL(lnurl: string): Promise<string> {
  // If it's already a URL, return it as-is
  if (lnurl.startsWith('http')) {
    return lnurl;
  }

  // If it starts with 'lnurl', decode it from bech32
  if (lnurl.toLowerCase().startsWith('lnurl')) {
    try {
      const decoded = bech32.decode(lnurl, 2000);
      const words = decoded.words;
      const bytes = bech32.fromWords(words);

      // Convert bytes to string (browser-compatible)
      const url = new TextDecoder().decode(new Uint8Array(bytes));
      return url;
    } catch (error) {
      throw new Error(`Failed to decode LNURL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  throw new Error('Invalid LNURL format');
}

export async function fetchLNURLPayInfo(lnurlOrUrl: string): Promise<LNURLPayResponse> {
  let url: string;

  try {
    // Decode the LNURL to get the actual URL
    url = await decodeLNURL(lnurlOrUrl);
  } catch (error) {
    // If decoding fails, maybe it's already a URL or in a different format
    // Try using it directly if it looks like a URL
    if (lnurlOrUrl.startsWith('http')) {
      url = lnurlOrUrl;
    } else {
      throw new Error(`Failed to decode LNURL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch LNURL info: ${response.status} ${response.statusText}. Response: ${text.substring(0, 100)}...`);
  }

  const contentType = response.headers.get('content-type');

  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON response but got ${contentType}. Response: ${text.substring(0, 100)}...`);
  }

  const data = await response.json();

  if (data.tag !== 'payRequest') {
    throw new Error(`Invalid LNURL-pay response: expected tag 'payRequest', got '${data.tag}'. Full response: ${JSON.stringify(data)}`);
  }

  return data as LNURLPayResponse;
}

export async function requestLNURLPayInvoice(
  callbackUrl: string,
  amountMsats: number,
  comment?: string
): Promise<LNURLPayCallbackResponse> {
  const url = new URL(callbackUrl);
  url.searchParams.set('amount', amountMsats.toString());

  if (comment) {
    url.searchParams.set('comment', comment);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to get invoice: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON response but got ${contentType}. Response: ${text.substring(0, 100)}...`);
  }

  const data = await response.json();

  if (data.status === 'ERROR') {
    throw new Error(data.reason || 'LNURL callback failed');
  }

  if (!data.pr) {
    throw new Error('No payment request in response');
  }

  return data as LNURLPayCallbackResponse;
}