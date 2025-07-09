import { createRoot } from 'react-dom/client';

// Import polyfills first
import './lib/polyfills.ts';

import App from './App.tsx';
import './index.css';

// Import punk rock fonts
import '@fontsource/black-ops-one';
import '@fontsource/metal-mania';
import '@fontsource/creepster';

createRoot(document.getElementById("root")!).render(<App />);
