import { useState, useEffect } from 'react';

// Simple in-memory cache to avoid duplicate requests during the same session
const memoryCache = new Map<string, string>();

interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  searchQuery: string;
  fallbackSeed?: string;
  overrideSrc?: string;
}

export const SmartImage = ({ searchQuery, fallbackSeed, overrideSrc, className, alt, ...props }: SmartImageProps) => {
  const [src, setSrc] = useState<string>(overrideSrc || '');
  const [loading, setLoading] = useState(!overrideSrc);

  useEffect(() => {
    if (overrideSrc) {
      setSrc(overrideSrc);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchImage = async () => {
      if (!searchQuery) return;
      
      setLoading(true);
      
      // 1. Check Memory Cache
      if (memoryCache.has(searchQuery)) {
        setSrc(memoryCache.get(searchQuery)!);
        setLoading(false);
        return;
      }
      
      // 2. Check Session Storage (CacheService equivalent for page refresh)
      try {
        const cachedUrl = sessionStorage.getItem(`wiki_img_${searchQuery}`);
        if (cachedUrl) {
          memoryCache.set(searchQuery, cachedUrl);
          setSrc(cachedUrl);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("SessionStorage access failed", e);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      try {
        // Step 1: Search Wikipedia for the closest page title
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&utf8=&format=json&origin=*`, {
          signal: controller.signal
        });
        const searchData = await searchRes.json();
        
        if (searchData.query?.search?.length > 0) {
          const title = searchData.query.search[0].title;
          
          // Step 2: Get the main image for that page
          const imageRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(title)}&origin=*`, {
            signal: controller.signal
          });
          const imageData = await imageRes.json();
          
          const pages = imageData.query?.pages;
          if (pages) {
            const pageId = Object.keys(pages)[0];
            const imageUrl = pages[pageId]?.original?.source;
            
            if (imageUrl && isMounted) {
              memoryCache.set(searchQuery, imageUrl);
              try { sessionStorage.setItem(`wiki_img_${searchQuery}`, imageUrl); } catch(e) {}
              setSrc(imageUrl);
              setLoading(false);
              clearTimeout(timeoutId);
              return;
            }
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`Wikipedia image fetch timed out for: ${searchQuery}`);
        } else {
          console.error("Failed to fetch image from Wikipedia:", error);
        }
      } finally {
        clearTimeout(timeoutId);
      }
      
      // Fallback to picsum if Wikipedia fails, times out, or has no image
      const fallback = `https://picsum.photos/seed/${encodeURIComponent(fallbackSeed || searchQuery)}/1920/1080`;
      if (isMounted) {
        memoryCache.set(searchQuery, fallback);
        try { sessionStorage.setItem(`wiki_img_${searchQuery}`, fallback); } catch(e) {}
        setSrc(fallback);
        setLoading(false);
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
    };
  }, [searchQuery, fallbackSeed, overrideSrc]);

  if (loading && !src) {
    return <div className={`animate-pulse bg-slate-800/50 ${className}`} />;
  }

  return (
    <img 
      src={src} 
      alt={alt || searchQuery} 
      className={className} 
      referrerPolicy="no-referrer"
      {...props} 
    />
  );
};
