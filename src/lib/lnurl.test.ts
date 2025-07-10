import { describe, it, expect } from 'vitest';
import { decodeLNURL } from './lnurl';

describe('lnurl', () => {
  describe('decodeLNURL', () => {
    it('returns URL as-is if already a URL', async () => {
      const url = 'https://example.com/lnurl-pay';
      const result = await decodeLNURL(url);
      expect(result).toBe(url);
    });

    it('throws error for invalid LNURL format', async () => {
      await expect(decodeLNURL('invalid')).rejects.toThrow('Invalid LNURL format');
    });

    it('throws error for malformed bech32 LNURL', async () => {
      await expect(decodeLNURL('lnurl1invalid')).rejects.toThrow('Failed to decode LNURL');
    });

    // Note: We can't easily test valid LNURL decoding without a real LNURL
    // since it requires proper bech32 encoding, but the structure is there
  });
});