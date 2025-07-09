// Wavlake API types and client
export interface WavlakeTrack {
  id: string;
  title: string;
  albumTitle: string;
  artist: string;
  artistId: string;
  albumId: string;
  artistArtUrl: string;
  albumArtUrl: string;
  mediaUrl: string;
  duration: number;
  releaseDate: string;
  msatTotal: string;
  artistNpub: string;
  order: number;
}

export interface WavlakeArtist {
  id: string;
  name: string;
  bio: string;
  artistArtUrl: string;
  albums: WavlakeAlbumSummary[];
}

export interface WavlakeAlbumSummary {
  id: string;
  title: string;
  albumArtUrl: string;
  releaseDate: string;
}

export interface WavlakeAlbum {
  id: string;
  title: string;
  artist: string;
  artistUrl: string;
  artistArtUrl: string;
  albumArtUrl: string;
  releaseDate: string;
  tracks: WavlakeTrack[];
}

export interface WavlakeSearchResult {
  id: string;
  name: string;
  type: 'artist' | 'album' | 'track';
  albumArtUrl?: string;
  artistArtUrl?: string;
  albumId?: string;
  albumTitle?: string;
  artistId?: string;
  artist?: string;
  duration?: number;
}

export interface WavlakeLnurlResponse {
  lnurl: string;
}

export interface WavlakeErrorResponse {
  code: number;
  success: boolean;
  error: string;
}

const WAVLAKE_API_BASE = 'https://wavlake.com/api/v1';

export class WavlakeAPI {
  private baseUrl: string;

  constructor(baseUrl: string = WAVLAKE_API_BASE) {
    this.baseUrl = baseUrl;
  }

  async searchContent(term: string): Promise<WavlakeSearchResult[]> {
    const response = await fetch(`${this.baseUrl}/content/search?term=${encodeURIComponent(term)}`);
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getRankings(params: {
    sort: 'sats';
    days?: number;
    startDate?: string;
    endDate?: string;
    genre?: string;
    limit?: number;
  }): Promise<WavlakeTrack[]> {
    const searchParams = new URLSearchParams();
    searchParams.set('sort', params.sort);
    
    if (params.days) searchParams.set('days', params.days.toString());
    if (params.startDate) searchParams.set('startDate', params.startDate);
    if (params.endDate) searchParams.set('endDate', params.endDate);
    if (params.genre) searchParams.set('genre', params.genre);
    if (params.limit) searchParams.set('limit', params.limit.toString());

    const response = await fetch(`${this.baseUrl}/content/rankings?${searchParams}`);
    if (!response.ok) {
      throw new Error(`Rankings failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getTrack(trackId: string): Promise<WavlakeTrack> {
    const response = await fetch(`${this.baseUrl}/content/track/${trackId}`);
    if (!response.ok) {
      throw new Error(`Track fetch failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getArtist(artistId: string): Promise<WavlakeArtist> {
    const response = await fetch(`${this.baseUrl}/content/artist/${artistId}`);
    if (!response.ok) {
      throw new Error(`Artist fetch failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getAlbum(albumId: string): Promise<WavlakeAlbum> {
    const response = await fetch(`${this.baseUrl}/content/album/${albumId}`);
    if (!response.ok) {
      throw new Error(`Album fetch failed: ${response.statusText}`);
    }
    return response.json();
  }

  async getLnurl(contentId: string, appId: string): Promise<WavlakeLnurlResponse> {
    const response = await fetch(`${this.baseUrl}/lnurl?contentId=${contentId}&appId=${appId}`);
    if (!response.ok) {
      throw new Error(`LNURL fetch failed: ${response.statusText}`);
    }
    return response.json();
  }
}

export const wavlakeAPI = new WavlakeAPI();