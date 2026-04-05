import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

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
      
      // Fallback to a neutral state if Wikipedia fails, times out, or has no image
      if (isMounted) {
        setSrc('');
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

  if (!loading && !src) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-2", className)}>
        <div className="p-4 rounded-full bg-slate-200/50">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
            <line x1="16" y1="5" x2="22" y2="5" />
            <line x1="19" y1="2" x2="19" y2="8" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">No Image Found</span>
      </div>
    );
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
