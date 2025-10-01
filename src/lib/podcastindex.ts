// PodcastIndex API types and client
export interface PodcastIndexFeed {
  id: number;
  title: string;
  url: string;
  originalUrl: string;
  link: string;
  description: string;
  author: string;
  ownerName: string;
  image: string;
  artwork: string;
  lastUpdateTime: number;
  lastCrawlTime: number;
  lastParseTime: number;
  lastGoodHttpStatusTime: number;
  lastHttpStatus: number;
  contentType: string;
  itunesId: number | null;
  generator: string;
  language: string;
  type: number;
  dead: number;
  crawlErrors: number;
  parseErrors: number;
  categories: Record<string, string> | null;
  locked: number;
  explicit: boolean;
  podcastGuid: string;
  medium: string;
  episodeCount: number;
  imageUrlHash: number;
  newestItemPubdate: number;
  inPollingQueue?: number;
  priority?: number;
}

export interface PodcastIndexSearchResponse {
  status: string;
  feeds: PodcastIndexFeed[];
  count: number;
  query: string;
  description: string;
}

export interface PodcastIndexTop100Item {
  rank: number;
  boosts: string;
  title: string;
  author: string;
  image: string;
  feedId: number;
  feedUrl: string;
  feedGuid: string;
  itemGuid: string;
}

export interface PodcastIndexEpisode {
  id: number;
  title: string;
  link: string;
  description: string;
  guid: string;
  datePublished: number;
  datePublishedPretty: string;
  dateCrawled: number;
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  duration: number;
  explicit: number;
  episode: number | null;
  episodeType: string;
  season: number;
  image: string;
  feedItunesId: number | null;
  feedImage: string;
  feedId: number;
  feedTitle: string;
  feedLanguage: string;
}

export interface PodcastIndexEpisodesResponse {
  status: string;
  items: PodcastIndexEpisode[];
  count: number;
  query: string;
  description: string;
}

const PODCASTINDEX_API_BASE = 'https://api.podcastindex.org/api/1.0';

export class PodcastIndexAPI {
  private baseUrl: string;
  private apiKey: string | undefined;
  private apiSecret: string | undefined;

  constructor(baseUrl: string = PODCASTINDEX_API_BASE) {
    this.baseUrl = baseUrl;
    // Get API credentials from environment variables
    this.apiKey = import.meta.env.VITE_PODCASTINDEX_API_KEY;
    this.apiSecret = import.meta.env.VITE_PODCASTINDEX_API_SECRET;

    // Debug: Log if credentials are loaded
    if (this.apiKey && this.apiSecret) {
      console.log('PodcastIndex credentials loaded successfully');
    } else {
      console.error('PodcastIndex credentials missing:', {
        hasKey: !!this.apiKey,
        hasSecret: !!this.apiSecret,
      });
    }
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    if (!this.apiKey || !this.apiSecret) {
      console.error('PodcastIndex API credentials not configured. Please add VITE_PODCASTINDEX_API_KEY and VITE_PODCASTINDEX_API_SECRET to your .env file');
      return {};
    }

    const apiHeaderTime = Math.floor(Date.now() / 1000);
    const hash4Header = await this.sha1(`${this.apiKey}${this.apiSecret}${apiHeaderTime}`);

    console.log('PodcastIndex Auth Debug:', {
      apiKey: this.apiKey.substring(0, 5) + '...',
      timestamp: apiHeaderTime,
      hashPreview: hash4Header.substring(0, 10) + '...',
    });

    return {
      'X-Auth-Date': apiHeaderTime.toString(),
      'X-Auth-Key': this.apiKey,
      'Authorization': hash4Header,
      'User-Agent': 'Zaptrax',
    };
  }

  private async sha1(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  async searchMusic(term: string): Promise<PodcastIndexSearchResponse> {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseUrl}/search/music/byterm?q=${encodeURIComponent(term)}&pretty`;

    console.log('PodcastIndex Search Request:', { url, headers });

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PodcastIndex API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`PodcastIndex search failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async getTop100Music(): Promise<PodcastIndexTop100Item[]> {
    // This endpoint doesn't require authentication
    const response = await fetch('https://stats.podcastindex.org/v4vmusic.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch top 100 music: ${response.statusText}`);
    }
    const data = await response.json();
    console.log('PodcastIndex Top 100 Response:', data);
    return data.items || [];
  }

  async getFeedEpisodes(feedId: number): Promise<PodcastIndexEpisodesResponse> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(
      `${this.baseUrl}/episodes/byfeedid?id=${feedId}&pretty`,
      { headers }
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch feed episodes: ${response.statusText}`);
    }
    return response.json();
  }
}

export const podcastIndexAPI = new PodcastIndexAPI();
