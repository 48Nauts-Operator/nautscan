// This component helps ensure the required textures for the 3D globe are available
// It directly provides a way to use texture URLs

import { useState } from 'react';

// Make texture URLs accessible globally for direct loading
declare global {
  interface Window {
    EARTH_TEXTURE_URL?: string;
    EARTH_BUMP_URL?: string;
    EARTH_CLOUDS_URL?: string;
    USE_DIRECT_TEXTURE_URLS?: boolean;
  }
}

const TEXTURE_FILES = [
  { 
    name: 'earth_texture.jpg',
    url: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/2_no_clouds_4k.jpg',
    globalVar: 'EARTH_TEXTURE_URL' as keyof Window
  },
  {
    name: 'earth_bump.jpg',
    url: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/elev_bump_4k.jpg',
    globalVar: 'EARTH_BUMP_URL' as keyof Window
  },
  {
    name: 'earth_clouds.png',
    url: 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/fair_clouds_4k.png',
    globalVar: 'EARTH_CLOUDS_URL' as keyof Window
  }
];

export default function EnsureTextures() {
  const [status, setStatus] = useState<'initial' | 'applied' | 'loading'>('initial');
  const [error, setError] = useState<string | null>(null);

  // Use direct URLs as fallback
  const useDirectUrls = () => {
    setStatus('loading');
    setError(null);
    
    try {
      // Use direct URLs for texture loading
      for (const file of TEXTURE_FILES) {
        (window as any)[file.globalVar] = file.url;
        console.log(`Using direct URL for ${file.name}: ${file.url}`);
      }
      
      // Set a flag to indicate we're using direct URLs
      window.USE_DIRECT_TEXTURE_URLS = true;
      
      // Mark as applied
      setStatus('applied');
      
    } catch (err) {
      console.error('Error setting texture URLs:', err);
      setError('Failed to set texture URLs. Please try again.');
      setStatus('initial');
    }
  };

  // If we've already applied the URLs, don't show anything
  if (status === 'applied') {
    return null;
  }

  // Simple UI for texture selection
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg shadow-lg z-50 max-w-xs">
      <h3 className="font-bold mb-2">3D Globe Textures</h3>
      
      {status === 'initial' && (
        <div>
          <p className="text-sm mb-2">
            Earth textures may need to be loaded from external sources.
          </p>
          <button
            onClick={useDirectUrls}
            className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs py-1 px-3 rounded"
          >
            Load Textures
          </button>
        </div>
      )}
      
      {status === 'loading' && (
        <div className="flex items-center">
          <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-2"></span>
          <span className="text-sm">Loading textures...</span>
        </div>
      )}
      
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
} 