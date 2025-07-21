import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { useLikeNote, useNoteReactions } from './useNostrMusic';

// Mock the useNostrPublish hook
vi.mock('./useNostrPublish', () => ({
  useNostrPublish: () => ({
    mutate: vi.fn(),
  }),
}));

// Mock the useCurrentUser hook
vi.mock('./useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      pubkey: 'test-pubkey',
    },
  }),
}));

describe('useNoteReactions', () => {
  it('should initialize correctly', () => {
    const { result } = renderHook(() => useNoteReactions('test-note-id'), {
      wrapper: TestApp,
    });

    // The hook should initialize with proper structure
    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });
});

describe('useLikeNote', () => {
  it('should return a mutation function', () => {
    const { result } = renderHook(() => useLikeNote(), {
      wrapper: TestApp,
    });

    expect(result.current.mutate).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');
  });

  it('should have correct mutation properties', () => {
    const { result } = renderHook(() => useLikeNote(), {
      wrapper: TestApp,
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
  });
});