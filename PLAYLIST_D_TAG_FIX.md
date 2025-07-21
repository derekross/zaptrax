# Playlist D-Tag Recognition Fix

## Issue
The application was only querying for playlists with the `#t: ['music']` tag, but missing playlists that have `d` tags starting with `"playlist-"` but might not have the music tag. This could cause some user-created playlists to not appear in the UI.

## Root Cause
When users create playlists, they get a `d` tag like `"playlist-1752105244449"`, but the queries were only looking for playlists with the `#t: ['music']` tag. If a playlist was created without the music tag (due to bugs, different clients, or edge cases), it wouldn't be found.

## Solution
Updated both the user playlists query and social feed query to recognize playlists by EITHER:
1. Having a `t: music` tag (existing behavior)
2. Having a `d` tag that starts with `"playlist-"` (new behavior)

### Changes Made

#### 1. Updated `useUserPlaylists` Hook
**File**: `src/hooks/useNostrMusic.ts`

**Before** (Relay-level filtering):
```typescript
const events = await nostr.query([
  {
    kinds: [30003],
    authors: [targetPubkey],
    '#t': ['music'], // Only music-tagged playlists
  }
], { signal });
```

**After** (JavaScript filtering):
```typescript
// Query all bookmark sets from the user
const events = await nostr.query([
  {
    kinds: [30003],
    authors: [targetPubkey],
  }
], { signal });

// Filter for music playlists: either has 't: music' tag OR 'd' tag starts with 'playlist-'
const musicPlaylists = events.filter(event => {
  const hasMusicTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'music');
  const hasPlaylistDTag = event.tags.some(tag => 
    tag[0] === 'd' && tag[1]?.startsWith('playlist-')
  );
  
  // Exclude the special "liked-songs" playlist as it's handled separately
  const isLikedSongs = event.tags.some(tag => tag[0] === 'd' && tag[1] === 'liked-songs');
  
  return (hasMusicTag || hasPlaylistDTag) && !isLikedSongs;
});
```

#### 2. Updated Social Feed Filtering
**File**: `src/hooks/useSocialFeed.ts`

**Query Changes**:
- Removed `#t: ['music']` filter from relay queries
- Increased limits since we're now filtering in JavaScript
- Fetch all kind 30003 events and filter client-side

**Filtering Logic**:
```typescript
// For playlists, check if they have music tag OR 'd' tag starts with 'playlist-'
if (event.kind === 30003) {
  const hasMusicTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'music');
  const hasPlaylistDTag = event.tags.some(tag => 
    tag[0] === 'd' && tag[1]?.startsWith('playlist-')
  );
  return hasMusicTag || hasPlaylistDTag;
}
```

## Benefits
- ✅ **Comprehensive playlist detection** - finds playlists by both music tag and d-tag pattern
- ✅ **Backward compatibility** - still recognizes existing music-tagged playlists
- ✅ **Forward compatibility** - handles playlists created by different clients
- ✅ **Edge case handling** - catches playlists that might be missing the music tag
- ✅ **Proper exclusion** - still excludes the special "liked-songs" playlist from regular playlist lists

## Technical Details

### Playlist Identification Patterns
1. **Music Tag**: `t: music` (existing standard)
2. **D-Tag Pattern**: `d: playlist-{timestamp}` (creation pattern)
3. **Special Case**: `d: liked-songs` (excluded from regular playlists)

### Query Strategy Change
- **Before**: Relay-level filtering with `#t: ['music']`
- **After**: Fetch all kind 30003 events and filter in JavaScript

This change is necessary because Nostr filters don't support prefix matching on tag values, so we can't query for `d` tags starting with `"playlist-"` at the relay level.

### Performance Considerations
- Slightly increased network traffic (fetching more events)
- Client-side filtering adds minimal processing overhead
- Increased query limits to compensate for JavaScript filtering
- Better accuracy in playlist detection outweighs the small performance cost

## Testing
- ✅ All existing tests pass
- ✅ Build completes successfully
- ✅ No breaking changes to existing functionality
- ✅ Improved playlist discovery and display

## Impact
This fix ensures that all user-created playlists are properly recognized and displayed, regardless of whether they have the music tag or only the playlist d-tag pattern. This improves the reliability of playlist management and social feed display.