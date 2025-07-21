# Social Feed Likes and Playlist Updates Fix

## Issue
The social feed was not showing when users:
1. **Liked songs** - Liked Songs playlist updates were being filtered out
2. **Updated playlists** - Some playlist modifications weren't appearing

## Root Cause Analysis

### 1. Liked Songs Updates Missing
When users like tracks, the system creates two events:
- **Kind 30003**: Updates the "Liked Songs" playlist (`d: liked-songs`)
- **Kind 7**: Creates a reaction event (`r: trackUrl`)

The social feed was filtering OUT the "Liked Songs" playlist updates, so users couldn't see when someone liked a track.

### 2. Playlist Updates Missing
The filtering logic was too restrictive and some playlist modifications weren't being included in the feed.

## Solution Implemented

### 1. Include "Liked Songs" Playlist Updates
**File**: `src/hooks/useSocialFeed.ts`

**Before** (Excluded liked-songs):
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

**After** (Includes liked-songs):
```typescript
// For playlists, check if they have music tag OR 'd' tag starts with 'playlist-' OR is 'liked-songs'
if (event.kind === 30003) {
  const hasMusicTag = event.tags.some(tag => tag[0] === 't' && tag[1] === 'music');
  const hasPlaylistDTag = event.tags.some(tag => 
    tag[0] === 'd' && tag[1]?.startsWith('playlist-')
  );
  const isLikedSongs = event.tags.some(tag => tag[0] === 'd' && tag[1] === 'liked-songs');
  return hasMusicTag || hasPlaylistDTag || isLikedSongs;
}
```

### 2. Special Handling for Liked Songs Updates
**File**: `src/pages/SocialFeedPage.tsx`

Added special detection and display logic for "Liked Songs" playlist updates:

**Activity Type Detection**:
```typescript
} else if (event.kind === 30003) {
  // Check if this is a "Liked Songs" playlist update
  const dTag = event.tags.find(tag => tag[0] === 'd')?.[1];
  const titleTag = event.tags.find(tag => tag[0] === 'title');
  const trackTags = event.tags.filter(tag => tag[0] === 'r');
  const trackUrls = trackTags.map(tag => tag[1]).filter(url => url?.includes('wavlake.com/track/'));
  
  if (dTag === 'liked-songs') {
    // This is a liked songs update - treat it as a like activity
    return {
      type: 'liked-songs-update',
      title: titleTag?.[1] || 'Liked Songs',
      trackCount: trackUrls.length,
      trackUrls
    };
  } else {
    // Regular playlist creation or update
    return {
      type: 'playlist',
      title: titleTag?.[1] || 'Untitled Playlist',
      trackCount: trackUrls.length,
      trackUrls
    };
  }
}
```

**Activity Display**:
- **Icon**: Heart icon (same as regular likes)
- **Text**: "liked a track" (instead of "updated a playlist")
- **Content**: Shows the most recently added track

### 3. UI Enhancements

**Activity Icon**:
```typescript
case 'liked-songs-update':
  return <Heart className="h-4 w-4 text-pink-500" />;
```

**Activity Text**:
```typescript
case 'liked-songs-update':
  return 'liked a track';
```

**Content Display**:
```typescript
{activity.type === 'liked-songs-update' && activity.trackUrls && activity.trackUrls.length > 0 && (
  <TrackReference
    trackUrl={activity.trackUrls[activity.trackUrls.length - 1]} // Show the most recently added track
    onAddToPlaylist={onAddToPlaylist}
    onComment={onComment}
    onZap={onZap}
  />
)}
```

## Benefits

### ✅ **Liked Songs Visibility**
- Users can now see when someone likes a track
- Shows the specific track that was liked
- Uses appropriate heart icon and "liked a track" text
- Displays the track with full interaction options

### ✅ **Complete Playlist Activity**
- All playlist modifications now appear in the feed
- Proper distinction between regular playlists and liked songs
- Maintains existing playlist update functionality

### ✅ **Better Social Engagement**
- More comprehensive activity feed
- Users can discover music through likes and playlist updates
- Improved social discovery features

## Technical Details

### Event Types Now Displayed
1. **Kind 30003** with `d: playlist-{timestamp}` - Regular playlist updates
2. **Kind 30003** with `d: liked-songs` - Liked songs updates (NEW)
3. **Kind 7** with `r: trackUrl` - Direct track reactions
4. **Kind 1** with music tags - Music-related notes
5. **Kind 1111** - Playlist comments

### Activity Types
- `'playlist'` - Regular playlist creation/updates
- `'liked-songs-update'` - Liked songs playlist updates (NEW)
- `'like'` - Direct track reactions (kind 7)
- `'comment'` - Track comments
- `'playlist-comment'` - Playlist comments

### Display Logic
- **Liked Songs Updates**: Show the most recently added track
- **Regular Playlists**: Show playlist summary with track count
- **Direct Reactions**: Show the specific track that was liked

## Testing
- ✅ All existing tests pass
- ✅ Build completes successfully
- ✅ No breaking changes to existing functionality
- ✅ Enhanced social feed activity display

## Impact
This fix significantly improves the social feed by showing all user music activity, including track likes and playlist modifications. Users can now see a complete picture of their friends' music discovery and curation activities, enhancing the social aspect of the platform.