import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebLN } from './useWebLN';

// Mock WebLN provider
const mockWebLNProvider = {
  enable: vi.fn(),
  getInfo: vi.fn(),
  sendPayment: vi.fn(),
  makeInvoice: vi.fn(),
  signMessage: vi.fn(),
  verifyMessage: vi.fn(),
};

describe('useWebLN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.webln
    delete (window as unknown as { webln?: unknown }).webln;
  });

  it('detects when WebLN is not available', () => {
    const { result } = renderHook(() => useWebLN());

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.provider).toBe(null);
  });

  it('detects when WebLN is available', () => {
    // Mock WebLN being available
    (window as unknown as { webln: typeof mockWebLNProvider }).webln = mockWebLNProvider;

    const { result } = renderHook(() => useWebLN());

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.provider).toBe(mockWebLNProvider);
  });

  it('enables WebLN successfully', async () => {
    (window as unknown as { webln: typeof mockWebLNProvider }).webln = mockWebLNProvider;
    mockWebLNProvider.enable.mockResolvedValue(undefined);

    const { result } = renderHook(() => useWebLN());

    await act(async () => {
      await result.current.enable();
    });

    expect(mockWebLNProvider.enable).toHaveBeenCalled();
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles WebLN enable errors', async () => {
    (window as unknown as { webln: typeof mockWebLNProvider }).webln = mockWebLNProvider;
    const error = new Error('User denied');
    mockWebLNProvider.enable.mockRejectedValue(error);

    const { result } = renderHook(() => useWebLN());

    await act(async () => {
      try {
        await result.current.enable();
      } catch {
        // Expected to throw
      }
    });

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.error).toBe('User denied');
  });

  it('sends payment successfully', async () => {
    (window as unknown as { webln: typeof mockWebLNProvider }).webln = mockWebLNProvider;
    const paymentResult = { preimage: 'abc123' };
    mockWebLNProvider.enable.mockResolvedValue(undefined);
    mockWebLNProvider.sendPayment.mockResolvedValue(paymentResult);

    const { result } = renderHook(() => useWebLN());

    // Enable first
    await act(async () => {
      await result.current.enable();
    });

    // Send payment
    let paymentResponse;
    await act(async () => {
      paymentResponse = await result.current.sendPayment('lnbc123...');
    });

    expect(mockWebLNProvider.sendPayment).toHaveBeenCalledWith('lnbc123...');
    expect(paymentResponse).toEqual(paymentResult);
  });

  it('throws error when trying to send payment without enabling', async () => {
    (window as unknown as { webln: typeof mockWebLNProvider }).webln = mockWebLNProvider;

    const { result } = renderHook(() => useWebLN());

    await act(async () => {
      try {
        await result.current.sendPayment('lnbc123...');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('WebLN not enabled');
      }
    });
  });
});