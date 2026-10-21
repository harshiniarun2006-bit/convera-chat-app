import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './services/pwa';

// Initialize PWA Service Worker for offline capability & installability
registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);

