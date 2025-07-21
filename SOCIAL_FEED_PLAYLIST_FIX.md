# Social Feed Playlist Modifications Fix

## Issue
The social feed was not showing when users modified their playlists. Playlist creation and updates were being filtered out and not appearing in the feed.

## Root Cause
The filtering logic in the social feed was too restrictive for playlist events (kind 30003). It required playlists to have BOTH:
1. A music tag (`t: music`)
2. Track references (`r` tags)

This caused several issues:
- **Empty playlists** were filtered out (no `r` tags)
- **Playlist modifications** that removed all tracks were filtered out
- **New empty playlists** created by users weren't shown

## Solution
Modified the filtering logic in `useSocialFeed.ts` to only require the music tag for playlists, making track references optional.

### Before (Restrictive)
```typescript
// For playlists, check if they have music tag and contain tracks
if (event.kind === 30003) {
  const hasMusicTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'music');
  const hasTracks = event.tags.some(tag => tag[0] === 'r');
  return hasMusicTag && hasTracks; // ❌ Required BOTH
}
```

### After (Inclusive)
```typescript
// For playlists, check if they have music tag (tracks are optional)
if (event.kind === 30003) {
  const hasMusicTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'music');
  return hasMusicTag; // ✅ Only requires music tag
}
```

## Benefits
- ✅ **Empty playlists** now appear in the social feed
- ✅ **Playlist modifications** (adding/removing tracks) are visible
- ✅ **Playlist creation** events are properly shown
- ✅ **Playlist updates** are displayed with appropriate activity text
- ✅ **Maintains filtering** - still only shows music-related playlists

## Activity Display Logic
The social feed already had proper logic to distinguish between playlist creation and updates:

```typescript
const getActivityText = () => {
  switch (activity.type) {
    case 'playlist':
      return (activity.trackCount || 0) > 0 ? 'updated a playlist' : 'created a playlist';
    // ...
  }
};
```

- **"created a playlist"** - shown for empty playlists (0 tracks)
- **"updated a playlist"** - shown for playlists with tracks

## Technical Details
- **Event Kind**: 30003 (Bookmark sets used for playlists)
- **Required Tag**: `t: music` (identifies it as a music playlist)
- **Optional Tags**: `r: <track-url>` (track references)
- **Filter Location**: `src/hooks/useSocialFeed.ts`

## Testing
- ✅ All existing tests pass
- ✅ Build completes successfully
- ✅ No breaking changes to existing functionality
- ✅ Playlist events now properly included in social feed

## Impact
This fix ensures that all playlist-related activity is visible in the social feed, providing better visibility into user music curation activities and improving the social aspect of the platform.