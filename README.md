# ZapTrax

A decentralized music player and discovery platform built on the Nostr protocol. ZapTrax combines music streaming from Wavlake with social features, Lightning payments, and decentralized playlist management, creating a comprehensive music experience powered by Bitcoin and Nostr.

## Features

ZapTrax is a full-featured decentralized music platform with the following capabilities:

### 🎵 Music Streaming & Discovery
- **Wavlake Integration** - Stream high-quality music from the Wavlake platform
- **Music Search** - Discover tracks, artists, and albums
- **Top Charts** - Browse trending music ranked by Lightning payments
- **Artist & Album Pages** - Detailed views with complete discographies

### 🎧 Player Features
- **Full Music Player** - Play, pause, skip, volume control, and seek functionality
- **Queue Management** - Add tracks to queue and manage playback order
- **Now Playing Status** - Broadcast current listening activity (NIP-38)
- **Persistent Playback** - Music continues across page navigation

### 📝 Playlist Management
- **Create Playlists** - Build custom playlists using NIP-51 bookmark sets
- **Liked Songs** - Automatic "Liked Songs" playlist for favorited tracks
- **Share Playlists** - Share playlists via Nostr addresses (naddr)
- **Edit & Delete** - Full playlist management capabilities

### 💬 Social Features
- **Track Comments** - Comment on tracks using kind 1 text notes
- **Like System** - Like tracks and artists with NIP-25 reactions
- **Artist Profiles** - View artist information and social interactions
- **Real-time Engagement** - See likes and comments from other users

### ⚡ Lightning Integration
- **Zap Tracks** - Send Lightning payments to support artists (NIP-57)
- **Zap Artists** - Direct artist support through Lightning
- **WebLN Support** - Seamless payments with WebLN-enabled wallets
- **Value-for-Value** - Support the music you love with micropayments

### 🔐 Decentralized Identity
- **Nostr Authentication** - Login with browser extensions (NIP-07)
- **Profile Management** - Edit your Nostr profile and metadata
- **Multi-Account Support** - Switch between multiple Nostr accounts
- **Privacy Controls** - Control what information you share

### 🎨 User Experience
- **Responsive Design** - Optimized for desktop and mobile devices
- **Dark/Light Themes** - Complete theme system with user preferences
- **PWA Support** - Install as a progressive web app
- **Offline Capabilities** - Continue using core features offline

## Technology Stack

### Frontend
- **React 18.x** - Modern React with hooks and concurrent rendering
- **TypeScript** - Type-safe JavaScript development
- **TailwindCSS 3.x** - Utility-first CSS framework for responsive design
- **Vite** - Fast build tool and development server
- **shadcn/ui** - Accessible UI components built with Radix UI

### Nostr & Bitcoin Integration
- **Nostrify** - Nostr protocol framework for web applications
- **WebLN** - Lightning Network browser integration
- **NIP-07** - Browser extension signing for secure authentication
- **TanStack Query** - Efficient data fetching and caching for Nostr events

### Music Platform
- **Wavlake API** - Music streaming and metadata from Wavlake
- **HTML5 Audio** - Native browser audio playback capabilities
- **React Context** - Global music player state management

### Routing & State
- **React Router** - Client-side routing with scroll restoration
- **React Context** - Application state management
- **Local Storage** - Persistent user preferences and settings

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Nostr browser extension (recommended: nos2x, Alby, or similar)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd zaptrax
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components (48+ available)
│   ├── auth/           # Authentication components
│   └── ...             # Feature-specific components
├── hooks/              # Custom React hooks
│   ├── useNostr.ts     # Core Nostr integration
│   ├── useAuthor.ts    # Fetch user profiles
│   ├── useCurrentUser.ts # Current user state
│   └── ...             # Additional hooks
├── pages/              # Page components for routing
├── lib/                # Utility functions
├── contexts/           # React context providers
└── test/               # Testing utilities
```

## Key Components

### Authentication

```tsx
import { LoginArea } from "@/components/auth/LoginArea";

function App() {
  return <LoginArea className="max-w-60" />;
}
```

### Profile Management

```tsx
import { EditProfileForm } from "@/components/EditProfileForm";

function EditProfile() {
  return <EditProfileForm />;
}
```

### Rich Text Content

```tsx
import { NoteContent } from "@/components/NoteContent";

function Post({ event }) {
  return (
    <div className="whitespace-pre-wrap break-words">
      <NoteContent event={event} className="text-sm" />
    </div>
  );
}
```

## Custom Hooks

### Querying Nostr Data

```tsx
import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';

function usePosts() {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['posts'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(1500)]);
      const events = await nostr.query([{ kinds: [1], limit: 20 }], { signal });
      return events;
    },
  });
}
```

### Publishing Events

```tsx
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function CreatePost() {
  const { user } = useCurrentUser();
  const { mutate: createEvent } = useNostrPublish();

  const handleSubmit = (content: string) => {
    createEvent({ kind: 1, content });
  };

  // Component implementation...
}
```

### File Uploads

```tsx
import { useUploadFile } from "@/hooks/useUploadFile";

function FileUploader() {
  const { mutateAsync: uploadFile, isPending } = useUploadFile();

  const handleUpload = async (file: File) => {
    const [[_, url]] = await uploadFile(file);
    // Use the uploaded file URL
  };

  // Component implementation...
}
```

## Configuration

### Relay Configuration

The app includes preset relay configurations:

- **Nostr.Band** (default) - `wss://relay.nostr.band`
- **Ditto** - `wss://relay.ditto.pub`
- **Damus** - `wss://relay.damus.io`
- **Primal** - `wss://relay.primal.net`

Users can switch relays using the `RelaySelector` component.

### Theme Configuration

Customize themes by modifying CSS custom properties in `src/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  /* ... other theme variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... dark theme variables */
}
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests with type checking and linting
- `npm run deploy` - Build and deploy (requires nostr-deploy-cli setup)

## Nostr Protocol Integration

This project follows Nostr protocol standards and best practices:

- **NIP-01** - Basic protocol flow
- **NIP-07** - Browser extension signing
- **NIP-19** - Bech32-encoded entities (npub, note, naddr, etc.)
- **NIP-44** - Encryption/decryption
- **NIP-94** - File metadata for uploads
- **Custom NIPs** - Documented in `NIP.md` when applicable

### Event Kinds

The project supports standard Nostr event kinds:

- **Kind 0** - User metadata/profiles
- **Kind 1** - Text notes/posts
- **Kind 3** - Contact lists
- **Custom kinds** - Application-specific events (documented in NIP.md)

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow React hooks patterns
- Use shadcn/ui components for UI consistency
- Implement proper loading states (skeletons for content, spinners for actions)
- Handle empty states with relay switching options

### Nostr Best Practices

- Always validate events with required tags/content
- Combine queries when possible to avoid rate limiting
- Use single-letter tags (`t`) for efficient relay filtering
- Prefer existing NIPs over custom kinds for interoperability
- Document custom event schemas in `NIP.md`

### Performance

- Use React Query for efficient data caching
- Implement proper loading and error states
- Optimize queries with appropriate timeouts and limits
- Use skeleton loading for better perceived performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

## License

[Add your license information here]

## About ZapTrax

ZapTrax is designed to provide a seamless experience for users navigating the Nostr ecosystem. The application focuses on:

- **Content Discovery** - Advanced algorithms for finding relevant content
- **Social Interactions** - Enhanced engagement features and community building
- **Value Exchange** - Lightning integration for micropayments and content monetization
- **Privacy & Security** - End-to-end encryption and decentralized identity management

## Acknowledgments

- Built with [MKStack](https://soapbox.pub/mkstack)
- Powered by the Nostr protocol
- UI components from shadcn/ui
- Nostr integration via Nostrify

---

For more information about the Nostr protocol, visit [nostr.com](https://nostr.com).
Learn more about Lightning payments at [lightning.network](https://lightning.network).