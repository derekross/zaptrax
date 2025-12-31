import React, { useEffect, useRef } from 'react';
import { NostrEvent, NPool, NRelay1 } from '@nostrify/nostrify';
import { NostrContext } from '@nostrify/react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '@/hooks/useAppContext';

interface NostrProviderProps {
  children: React.ReactNode;
}

const NostrProvider: React.FC<NostrProviderProps> = (props) => {
  const { children } = props;
  const { config } = useAppContext();

  const queryClient = useQueryClient();

  // Create NPool instance only once
  const pool = useRef<NPool | undefined>(undefined);

  // Use refs so the pool always has the latest data
  const relayUrl = useRef<string>(config.relayUrl);

  // Define multiple relays for better data coverage
  // This ensures we don't miss content from different relays
  const multiRelayUrls = useRef<string[]>([
    'wss://relay.primal.net',
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.ditto.pub'
  ]);

  // Update refs when config changes
  useEffect(() => {
    relayUrl.current = config.relayUrl;
    // Ensure selected relay is first in the list for priority
    multiRelayUrls.current = [
      config.relayUrl,
      ...multiRelayUrls.current.filter(url => url !== config.relayUrl)
    ].slice(0, 4); // Limit to 4 relays max for performance
    queryClient.resetQueries();
  }, [config.relayUrl, queryClient]);

  // Initialize NPool only once
  if (!pool.current) {
    pool.current = new NPool({
      open(url: string) {
        return new NRelay1(url);
      },
      reqRouter(filters) {
        // Query multiple relays for better data coverage and consistency
        // NPool automatically deduplicates results from multiple relays
        const relayMap = new Map();
        multiRelayUrls.current.forEach(url => {
          relayMap.set(url, filters);
        });
        return relayMap;
      },
      eventRouter(_event: NostrEvent) {
        // Publish to all configured relays for better distribution
        return multiRelayUrls.current;
      },
    });
  }

  return (
    <NostrContext.Provider value={{ nostr: pool.current }}>
      {children}
    </NostrContext.Provider>
  );
};

export default NostrProvider;