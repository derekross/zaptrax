import { describe, it, expect } from 'vitest';
import { isNpub, isNip05, decodeNpub } from './nostrSearch';

describe('nostrSearch', () => {
  describe('isNpub', () => {
    it('identifies valid npub', () => {
      expect(isNpub('npub1w0rthyjyp2f5gful0gm2500pwyxfrx93a85289xdz0sd6hyef33sh2cu4x')).toBe(true);
    });

    it('rejects invalid npub', () => {
      expect(isNpub('invalid')).toBe(false);
      expect(isNpub('npub1short')).toBe(false);
      expect(isNpub('nsec1w0rthyjyp2f5gful0gm2500pwyxfrx93a85289xdz0sd6hyef33sh2cu4x')).toBe(false);
    });
  });

  describe('isNip05', () => {
    it('identifies valid NIP-05 addresses', () => {
      expect(isNip05('alice@example.com')).toBe(true);
      expect(isNip05('bob@domain.org')).toBe(true);
      expect(isNip05('user123@test.co.uk')).toBe(true);
    });

    it('rejects invalid NIP-05 addresses', () => {
      expect(isNip05('invalid')).toBe(false);
      expect(isNip05('@example.com')).toBe(false);
      expect(isNip05('alice@')).toBe(false);
      expect(isNip05('alice@invalid')).toBe(false);
    });
  });

  describe('decodeNpub', () => {
    it('decodes valid npub to pubkey', () => {
      const npub = 'npub1w0rthyjyp2f5gful0gm2500pwyxfrx93a85289xdz0sd6hyef33sh2cu4x';
      const pubkey = decodeNpub(npub);
      expect(pubkey).toBeTruthy();
      expect(typeof pubkey).toBe('string');
      expect(pubkey?.length).toBe(64);
    });

    it('returns null for invalid npub', () => {
      expect(decodeNpub('invalid')).toBe(null);
      expect(decodeNpub('nsec1w0rthyjyp2f5gful0gm2500pwyxfrx93a85289xdz0sd6hyef33sh2cu4x')).toBe(null);
    });
  });
});