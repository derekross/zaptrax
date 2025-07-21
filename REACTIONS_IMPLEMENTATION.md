# Reactions/Likes Implementation - Nostr Standards Compliance

## Overview

The reactions/likes system in ZapTrax has been updated to properly follow Nostr protocol standards as defined in NIP-25 (Reactions) and NIP-09 (Event Deletion Request).

## Previous Implementation Issues

The previous implementation was using a "negative reaction" approach:
- **Like**: Send kind 7 reaction with content `"❤️"`
- **Unlike**: Send kind 7 reaction with content `"-"`

While this approach was technically valid according to NIP-25, it wasn't the most appropriate way to handle "unlikes" in the Nostr ecosystem.

## Updated Implementation

### For Likes
✅ **Correct**: Creates a kind 7 reaction event with content `"+"` (standard like indicator)
- Includes proper tags: `e` (event ID), `p` (author pubkey), `k` (kind being reacted to)
- Follows NIP-25 specifications exactly

### For Unlikes  
✅ **Improved**: Uses NIP-09 Event Deletion Request
- Finds the user's existing like reaction
- Creates a kind 5 deletion request to remove the original like
- More semantically correct than negative reactions

## Technical Changes

### 1. Like/Unlike Logic (`useLikeNote`)
```typescript
// Like: Create positive reaction (NIP-25)
createEvent({
  kind: 7, // Reaction
  content: '+', // Standard like content as per NIP-25
  tags: [
    ['e', noteId],
    ['p', authorPubkey], 
    ['k', '1'], // Reacting to a text note
  ],
});

// Unlike: Delete the existing like reaction (NIP-09)
if (userLikeReaction) {
  createEvent({
    kind: 5, // Event Deletion Request
    content: 'Unlike',
    tags: [
      ['e', userLikeReaction.id], // Reference to the like being deleted
      ['k', '7'], // Kind of the event being deleted (reaction)
    ],
  });
}
```

### 2. Track Reactions (`useLikeTrack`)
- Updated to use `"+"` for likes instead of `"❤️"`
- Uses deletion requests for unlikes instead of `"-"` reactions
- Same pattern as note reactions

### 3. Artist Reactions (`useLikeArtist`)
- Updated to use `"+"` for consistency with NIP-25 standards

### 4. Query Functions Enhanced
All reaction query functions now handle deletion events:
- Query both kind 7 (reactions) and kind 5 (deletions) events
- Filter out reactions that have been deleted
- Provides accurate like counts that respect deletion requests

```typescript
// Query both reactions and deletion events
const [reactionEvents, deletionEvents] = await Promise.all([
  nostr.query([{ kinds: [7], '#e': [noteId], limit: 100 }], { signal }),
  nostr.query([{ kinds: [5], limit: 100 }], { signal })
]);

// Create a set of deleted event IDs
const deletedEventIds = new Set(
  deletionEvents.flatMap(deletion => 
    deletion.tags
      .filter(tag => tag[0] === 'e')
      .map(tag => tag[1])
  )
);

// Filter out deleted reactions
const events = reactionEvents.filter(event => !deletedEventIds.has(event.id));
```

## Benefits of This Approach

### 1. **Standards Compliance**
- Follows NIP-25 exactly for reactions
- Uses NIP-09 appropriately for deletion requests
- More interoperable with other Nostr clients

### 2. **Semantic Correctness**
- Deletion requests are semantically correct for "unlikes"
- Cleaner data model (no negative reactions cluttering the feed)
- Better represents user intent

### 3. **Relay Efficiency**
- Relays can properly handle deletion requests
- Deleted reactions won't be served to clients that respect NIP-09
- Reduces noise in reaction queries

### 4. **User Experience**
- More responsive UI with optimistic updates
- Accurate like counts that respect deletions
- Consistent behavior across all reaction types

## Backward Compatibility

The system still handles the old `"-"` reactions correctly:
- Existing negative reactions are still processed
- The "most recent reaction per user" logic handles mixed old/new data
- Gradual migration as users interact with the new system

## Testing

All existing tests pass with the new implementation:
- ✅ `useNoteReactions` tests
- ✅ `useLikeNote` tests  
- ✅ Component integration tests
- ✅ Build process completes successfully

## Future Considerations

1. **Relay Support**: Some relays may not fully implement NIP-09 deletion handling
2. **Client Compatibility**: Other clients may still use negative reactions
3. **Performance**: Querying deletion events adds slight overhead but improves accuracy

The implementation gracefully handles these scenarios while providing the most standards-compliant experience possible.