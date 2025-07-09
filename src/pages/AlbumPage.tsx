import { useParams } from 'react-router-dom';
import { useWavlakeAlbum } from '@/hooks/useWavlake';
import { TrackCard } from '@/components/music/TrackCard';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Disc } from 'lucide-react';

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { data: albumData, isLoading, error } = useWavlakeAlbum(albumId);
  
  // Handle case where API might return an array
  const album = Array.isArray(albumData) ? albumData[0] : albumData;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <Skeleton className="w-32 h-32 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <Disc className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Album not found</h3>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'The album you are looking for does not exist.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Album Header */}
      <div className="flex items-center space-x-4 mb-8">
        <img 
          src={album.albumArtUrl} 
          alt={album.title} 
          className="w-32 h-32 rounded-md border-2 border-primary"
        />
        <div>
          <h1 className="text-4xl font-bold font-punk tracking-wider text-primary">
            {album.title.toUpperCase()}
          </h1>
          <p className="text-lg text-accent font-metal">
            {album.artist}
          </p>
          <p className="text-sm text-muted-foreground">
            {album.tracks.length} tracks
          </p>
        </div>
      </div>

      {/* Album Tracks */}
      <div className="space-y-4">
        <h2 className="text-2xl font-punk font-black tracking-wider text-primary torn-edge">
          TRACKS
        </h2>
        {album.tracks.map((track, index) => (
          <div key={track.id} className="relative">
            {/* Track Number Badge */}
            <div className="absolute -left-2 top-4 z-10">
              <div className="bg-accent text-accent-foreground text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {index + 1}
              </div>
            </div>

            <TrackCard
              track={track}
              className="ml-4"
              queue={album.tracks}
            />
          </div>
        ))}
      </div>
    </div>
  );
} 