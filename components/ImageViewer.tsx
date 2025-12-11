
import React, { useState, useEffect, useRef } from 'react';
import { Wallpaper, AspectRatio } from '../types';
import { X, Download, RefreshCw, Share2, Copy, Check, MessageSquare, Wand2, Edit2, RotateCw, Crop, Palette, Undo, Save, ChevronLeft, Instagram, Facebook, Youtube, Link, AtSign, MessageCircle, Send, MessageSquareDashed } from 'lucide-react';

interface ImageViewerProps {
  wallpaper: Wallpaper | null;
  onClose: () => void;
  onRemix: (wallpaper: Wallpaper) => void;
  onJumpToChat?: () => void;
  onGenerateSimilar?: (wallpaper: Wallpaper) => void;
  onReplaceSubject?: (wallpaper: Wallpaper) => void;
}

type FilterType = 'none' | 'cinematic' | 'film' | 'noir' | 'grayscale' | 'sepia' | 'vintage' | 'cool' | 'warm';
type CropRatio = 'original' | 'square' | '9:16' | '16:9' | '4:3';

const FILTERS: { id: FilterType; name: string; css: string }[] = [
    { id: 'none', name: 'Normal', css: 'none' },
    { id: 'cinematic', name: 'Cinematic', css: 'contrast(110%) brightness(90%) saturate(130%)' },
    { id: 'film', name: 'Film Look', css: 'sepia(20%) brightness(110%) contrast(90%) saturate(80%)' },
    { id: 'noir', name: 'Noir', css: 'grayscale(100%) contrast(120%) brightness(90%)' },
    { id: 'grayscale', name: 'B&W', css: 'grayscale(100%)' },
    { id: 'sepia', name: 'Sepia', css: 'sepia(100%)' },
    { id: 'vintage', name: 'Vintage', css: 'sepia(40%) contrast(110%) brightness(90%) saturate(80%)' },
    { id: 'cool', name: 'Cool', css: 'sepia(20%) hue-rotate(180deg) saturate(120%) brightness(105%) contrast(105%)' },
    { id: 'warm', name: 'Warm', css: 'sepia(40%) hue-rotate(-15deg) saturate(140%) contrast(105%)' },
];

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'hover:text-pink-500' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'hover:text-blue-500' },
  { id: 'threads', name: 'Threads', icon: AtSign, color: 'hover:text-white' }, // Using AtSign as proxy
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'hover:text-red-500' },
  { id: 'reddit', name: 'Reddit', icon: MessageSquareDashed, color: 'hover:text-orange-500' }, // Proxy
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'hover:text-green-500' }, // Proxy
  { id: 'telegram', name: 'Telegram', icon: Send, color: 'hover:text-sky-500' }, // Proxy
  { id: 'link', name: 'Copy Link', icon: Link, color: 'hover:text-indigo-400' },
];

const SOCIAL_URLS: Record<string, string> = {
  instagram: 'https://www.instagram.com/',
  facebook: 'https://www.facebook.com/',
  threads: 'https://www.threads.net/',
  youtube: 'https://studio.youtube.com/',
  reddit: 'https://www.reddit.com/',
  whatsapp: 'https://web.whatsapp.com/',
  telegram: 'https://web.telegram.org/',
};

const ImageViewer: React.FC<ImageViewerProps> = ({ wallpaper, onClose, onRemix, onJumpToChat, onGenerateSimilar, onReplaceSubject }) => {
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  
  // Edit Parameters
  const [rotation, setRotation] = useState(0);
  const [filter, setFilter] = useState<FilterType>('none');
  const [cropRatio, setCropRatio] = useState<CropRatio>('original');
  const [editTab, setEditTab] = useState<'filter' | 'adjust' | 'crop'>('filter');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset when opening a new wallpaper
  useEffect(() => {
    if (wallpaper) {
        setActiveUrl(wallpaper.url);
        resetEdits();
        setIsShareMenuOpen(false);

        // Generate thumbnail if video for filter preview
        if (wallpaper.type === 'video') {
            const vid = document.createElement('video');
            vid.src = wallpaper.url;
            vid.crossOrigin = 'anonymous';
            vid.currentTime = 0.5; // Capture frame at 0.5s
            vid.muted = true;
            vid.onloadeddata = () => {
                // Wait a bit for seek
                setTimeout(() => {
                    const canvas = document.createElement('canvas');
                    const ratio = vid.videoWidth / vid.videoHeight;
                    canvas.width = 150; 
                    canvas.height = 150 / ratio;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(vid, 0, 0, canvas.width, canvas.height);
                    try {
                        setVideoThumbnail(canvas.toDataURL());
                    } catch (e) {
                        console.warn("Could not generate video thumbnail", e);
                        setVideoThumbnail(null); // Fallback
                    }
                }, 200);
            };
            vid.load(); // Trigger load
        } else {
            setVideoThumbnail(null);
        }
    }
  }, [wallpaper]);

  const resetEdits = () => {
      setRotation(0);
      setFilter('none');
      setCropRatio('original');
      setIsEditing(false);
  };

  if (!wallpaper || !activeUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = activeUrl!;
    const isVideo = wallpaper.type === 'video';
    const isEdited = activeUrl !== wallpaper.url;
    // If it's a video and edited, we likely produced a WebM via MediaRecorder. Originals are MP4.
    const ext = isVideo ? (isEdited ? 'webm' : 'mp4') : 'png';
    link.download = `vibewall-${wallpaper.id}${isEdited ? '-edited' : ''}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const convertToPngBlob = async (url: string): Promise<Blob> => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                  reject(new Error("Canvas context failed"));
                  return;
              }
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                  if (blob) resolve(blob);
                  else reject(new Error("Blob creation failed"));
              }, 'image/png');
          };
          img.onerror = (e) => reject(e);
          img.src = url;
      });
  };

  const copyImageToClipboard = async (url: string) => {
      try {
          const response = await fetch(url);
          let blob = await response.blob();
          
          // Clipboard API often requires PNG for images.
          if (blob.type !== 'image/png') {
              blob = await convertToPngBlob(url);
          }
          
          await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
          ]);
          return true;
      } catch (e) {
          console.error("Clipboard write failed", e);
          throw e;
      }
  };

  const handleCopy = async () => {
      if (!activeUrl || wallpaper.type !== 'image') return;
      try {
          await copyImageToClipboard(activeUrl);
          setShareFeedback('Copied!');
          setTimeout(() => setShareFeedback(null), 2000);
      } catch (err) {
          console.error("Copy failed", err);
          setShareFeedback('Failed');
          setTimeout(() => setShareFeedback(null), 2000);
      }
  };

  const performShare = async (platformId?: string) => {
    setIsSharing(true);
    setShareFeedback(null);

    try {
        // Prepare File for Native Share
        const response = await fetch(activeUrl!);
        const blob = await response.blob();
        const isVideo = wallpaper.type === 'video';
        const isEdited = activeUrl !== wallpaper.url;
        
        const ext = isVideo ? (isEdited ? 'webm' : 'mp4') : 'png';
        const mimeType = isVideo ? (isEdited ? 'video/webm' : 'video/mp4') : 'image/png';
        
        const file = new File([blob], `vibewall-${wallpaper.id}.${ext}`, { type: mimeType });

        // 1. "Copy Link" Action (Effective Copy Image)
        if (platformId === 'link') {
            if (wallpaper.type === 'image' && typeof ClipboardItem !== 'undefined' && navigator.clipboard) {
                await copyImageToClipboard(activeUrl!);
                setShareFeedback('Image Copied!');
            } else {
                 setShareFeedback('Link Copied!'); 
                 if (navigator.clipboard) await navigator.clipboard.writeText(activeUrl!);
            }
            return;
        }

        // 2. Native Share (Mobile/Supported)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
             await navigator.share({
                files: [file],
                title: 'VibeWall Generation',
                text: `Check out this ${isVideo ? 'live ' : ''}wallpaper!`,
             });
             setShareFeedback('Shared!');
        } else {
            // 3. Desktop / Fallback
            // If the user selected a social platform, download the file and open the platform
            const socialUrl = platformId ? SOCIAL_URLS[platformId] : undefined;
            
            if (socialUrl) {
                // Download file so user has it ready
                handleDownload();
                
                // Open new tab to the social media site
                window.open(socialUrl, '_blank');
                
                const name = SOCIAL_PLATFORMS.find(p => p.id === platformId)?.name || 'App';
                setShareFeedback(`Saved! Upload to ${name}`);
            } else if (wallpaper.type === 'image' && typeof ClipboardItem !== 'undefined' && navigator.clipboard) {
                 await copyImageToClipboard(activeUrl!);
                 setShareFeedback(`Copied! Paste in App`);
            } else {
                 handleDownload();
                 setShareFeedback('Downloaded!');
            }
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            console.error('Sharing failed:', error);
            setShareFeedback('Failed');
        }
    } finally {
        setIsSharing(false);
        setTimeout(() => {
            setShareFeedback(null);
            setIsShareMenuOpen(false);
        }, 4000);
    }
  };

  const handleSaveEdits = async () => {
      if (!wallpaper) return;
      setIsProcessing(true);

      try {
        // --- VIDEO PROCESSING ---
        if (wallpaper.type === 'video') {
            const video = document.createElement('video');
            video.src = wallpaper.url;
            video.crossOrigin = 'anonymous';
            video.muted = true;
            await video.play();
            video.pause();
            video.currentTime = 0;

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("No canvas context");

            const stream = canvas.captureStream(30); // 30 FPS target
            // Prefer VP9 for webm if supported, else default
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
                ? 'video/webm;codecs=vp9' 
                : 'video/webm';
            
            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: BlobPart[] = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            
            const recordingPromise = new Promise<string>((resolve, reject) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    resolve(URL.createObjectURL(blob));
                };
                recorder.onerror = reject;
            });

            recorder.start();
            await video.play();

            const draw = () => {
                if (video.paused || video.ended) return;
                const filterDef = FILTERS.find(f => f.id === filter);
                if (filterDef) ctx.filter = filterDef.css;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                requestAnimationFrame(draw);
            };
            draw();

            await new Promise(resolve => { video.onended = resolve; });
            recorder.stop();
            
            const newUrl = await recordingPromise;
            setActiveUrl(newUrl);
            setIsEditing(false);
            return;
        }

        // --- IMAGE PROCESSING ---
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = wallpaper.url; 
        await new Promise(resolve => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("No context");

        // Calculate Dimensions (Rotation swap)
        let srcWidth = img.naturalWidth;
        let srcHeight = img.naturalHeight;
        
        // If cropping
        let cropX = 0, cropY = 0, cropW = srcWidth, cropH = srcHeight;
        
        if (cropRatio !== 'original') {
            let targetRatio = 1;
            if (cropRatio === 'square') targetRatio = 1;
            if (cropRatio === '9:16') targetRatio = 9/16;
            if (cropRatio === '16:9') targetRatio = 16/9;
            if (cropRatio === '4:3') targetRatio = 4/3;

            const currentRatio = srcWidth / srcHeight;

            if (currentRatio > targetRatio) {
                cropH = srcHeight;
                cropW = srcHeight * targetRatio;
                cropX = (srcWidth - cropW) / 2;
            } else {
                cropW = srcWidth;
                cropH = srcWidth / targetRatio;
                cropY = (srcHeight - cropH) / 2;
            }
        }

        const isRotated90 = rotation % 180 !== 0;
        canvas.width = isRotated90 ? cropH : cropW;
        canvas.height = isRotated90 ? cropW : cropH;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        
        const filterDef = FILTERS.find(f => f.id === filter);
        if (filterDef && filterDef.css !== 'none') {
            ctx.filter = filterDef.css;
        }

        ctx.drawImage(
            img, 
            cropX, cropY, cropW, cropH, 
            -cropW/2, -cropH/2, cropW, cropH
        );

        const newUrl = canvas.toDataURL('image/png', 0.95);
        setActiveUrl(newUrl);
        setIsEditing(false);

      } catch (e) {
          console.error("Failed to save edits", e);
      } finally {
          setIsProcessing(false);
      }
  };

  const currentFilterCss = FILTERS.find(f => f.id === filter)?.css || 'none';
  const isVideo = wallpaper.type === 'video';

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50 bg-gradient-to-b from-black/60 to-transparent">
        {isEditing ? (
             <div className="flex items-center gap-4 w-full justify-between">
                <button 
                    onClick={() => {
                        resetEdits();
                        setActiveUrl(wallpaper.url); // Revert to original
                    }}
                    className="p-2 bg-black/40 hover:bg-slate-800 rounded-full text-white backdrop-blur-md border border-white/10 transition-all"
                >
                    <X size={24} />
                </button>
                <span className="font-semibold text-white">Edit {isVideo ? 'Video' : 'Image'}</span>
                <button 
                    onClick={handleSaveEdits}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white font-medium transition-all shadow-lg flex items-center gap-2"
                >
                    {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    {isProcessing ? (isVideo ? 'Rendering...' : 'Saving...') : 'Save'}
                </button>
             </div>
        ) : (
             <>
                <div className="flex gap-2">
                    {onJumpToChat && (
                        <button 
                            onClick={onJumpToChat}
                            className="p-2 bg-black/40 hover:bg-slate-800 rounded-full text-white backdrop-blur-md border border-white/10 transition-all flex items-center gap-2 px-4"
                        >
                            <MessageSquare size={18} />
                            <span className="text-sm font-medium hidden sm:inline">Chat</span>
                        </button>
                    )}
                </div>

                <button 
                    onClick={onClose}
                    className="p-2 bg-black/40 hover:bg-slate-800 rounded-full text-white backdrop-blur-md border border-white/10 transition-all"
                >
                    <X size={24} />
                </button>
             </>
        )}
      </div>

      {/* Image/Video Container */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {wallpaper.type === 'video' ? (
             <div className="relative max-h-full max-w-full flex items-center justify-center">
                 <video 
                    src={activeUrl} 
                    controls={!isEditing}
                    autoPlay
                    loop
                    muted={isEditing} // Mute while editing to avoid annoying overlap if previewing
                    className="max-h-full max-w-full rounded-lg shadow-2xl shadow-black bg-black"
                    style={{
                        filter: isEditing ? currentFilterCss : 'none'
                    }}
                 />
                 {isEditing && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur pointer-events-none">
                        Previewing {FILTERS.find(f => f.id === filter)?.name}
                    </div>
                 )}
             </div>
        ) : (
            <div className="relative max-h-full max-w-full flex items-center justify-center">
                {isEditing ? (
                     // Edit Preview
                     <div className="relative overflow-hidden shadow-2xl shadow-black rounded-lg transition-all duration-300">
                        <img 
                            src={wallpaper.url} 
                            alt="Editing"
                            className="max-h-[80vh] max-w-full object-contain transition-all duration-300"
                            style={{
                                transform: `rotate(${rotation}deg)`,
                                filter: currentFilterCss,
                            }}
                        />
                        {/* Simple Crop Overlay Guide */}
                        {cropRatio !== 'original' && (
                            <div className="absolute inset-0 pointer-events-none border-2 border-indigo-500/50 flex items-center justify-center">
                                <span className="bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur">
                                    Crop: {cropRatio}
                                </span>
                            </div>
                        )}
                     </div>
                ) : (
                    <img 
                        src={activeUrl} 
                        alt={wallpaper.prompt} 
                        className="max-h-full max-w-full object-contain rounded-lg shadow-2xl shadow-black"
                    />
                )}
            </div>
        )}
      </div>

      {/* Share Sheet Overlay */}
      {isShareMenuOpen && (
          <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsShareMenuOpen(false)}>
              <div 
                className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-10"
                onClick={e => e.stopPropagation()}
              >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <h3 className="text-lg font-semibold text-white">Share to...</h3>
                      <button onClick={() => setIsShareMenuOpen(false)} className="text-slate-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 py-2">
                      {SOCIAL_PLATFORMS.map((platform) => {
                          const Icon = platform.icon;
                          return (
                              <button
                                  key={platform.id}
                                  onClick={() => performShare(platform.id)}
                                  className="flex flex-col items-center gap-2 group"
                              >
                                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-slate-700 group-hover:border-slate-600 transition-all">
                                      <Icon size={24} className={`text-slate-300 transition-colors ${platform.color}`} />
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium">{platform.name}</span>
                              </button>
                          )
                      })}
                  </div>
                  
                  {shareFeedback && (
                      <div className="text-center py-2 text-sm font-medium text-green-400 animate-in fade-in">
                          {shareFeedback}
                      </div>
                  )}

                  <button 
                    onClick={() => setIsShareMenuOpen(false)}
                    className="w-full py-3 bg-slate-800 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                      Cancel
                  </button>
              </div>
          </div>
      )}

      {/* Footer / Controls */}
      <div className="p-4 sm:p-6 pb-8 sm:pb-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-sm z-50">
        
        {isEditing ? (
            /* EDIT CONTROLS */
            <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
                {/* Tabs */}
                <div className="flex justify-center gap-6 pb-2">
                    <button 
                        onClick={() => setEditTab('filter')}
                        className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${editTab === 'filter' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <div className={`p-2 rounded-full ${editTab === 'filter' ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
                            <Palette size={20} />
                        </div>
                        Filters
                    </button>
                    {!isVideo && (
                        <>
                            <button 
                                onClick={() => setEditTab('adjust')}
                                className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${editTab === 'adjust' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <div className={`p-2 rounded-full ${editTab === 'adjust' ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
                                    <RotateCw size={20} />
                                </div>
                                Rotate
                            </button>
                            <button 
                                onClick={() => setEditTab('crop')}
                                className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${editTab === 'crop' ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                                <div className={`p-2 rounded-full ${editTab === 'crop' ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
                                    <Crop size={20} />
                                </div>
                                Crop
                            </button>
                        </>
                    )}
                </div>

                {/* Tab Content */}
                <div className="bg-slate-900/80 rounded-2xl p-4 border border-white/5 min-h-[80px] flex items-center justify-center">
                    {editTab === 'filter' && (
                        <div className="flex gap-3 overflow-x-auto w-full no-scrollbar px-2">
                            {FILTERS.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={`flex flex-col items-center gap-1 min-w-[60px] group ${filter === f.id ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                >
                                    <div className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${filter === f.id ? 'border-indigo-500 scale-105' : 'border-transparent'}`}>
                                        {isVideo && videoThumbnail ? (
                                            <img 
                                                src={videoThumbnail} 
                                                className="w-full h-full object-cover" 
                                                style={{ filter: f.css }}
                                                alt={f.name}
                                            />
                                        ) : isVideo ? (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs">...</div>
                                        ) : (
                                            <img 
                                                src={wallpaper?.url} 
                                                className="w-full h-full object-cover" 
                                                style={{ filter: f.css }}
                                                alt={f.name}
                                            />
                                        )}
                                    </div>
                                    <span className="text-[10px] font-medium text-white">{f.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {editTab === 'adjust' && !isVideo && (
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setRotation(r => (r - 90))}
                                className="px-4 py-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700 flex items-center gap-2"
                            >
                                <RotateCw className="scale-x-[-1]" size={18} />
                                -90°
                            </button>
                            <div className="flex items-center justify-center w-16 font-mono text-indigo-400 font-bold">
                                {rotation % 360}°
                            </div>
                            <button 
                                onClick={() => setRotation(r => (r + 90))}
                                className="px-4 py-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700 flex items-center gap-2"
                            >
                                <RotateCw size={18} />
                                +90°
                            </button>
                        </div>
                    )}

                    {editTab === 'crop' && !isVideo && (
                        <div className="flex gap-2 overflow-x-auto w-full justify-center">
                            {(['original', 'square', '9:16', '16:9', '4:3'] as CropRatio[]).map(ratio => (
                                <button
                                    key={ratio}
                                    onClick={() => setCropRatio(ratio)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                                        cropRatio === ratio 
                                        ? 'bg-indigo-600 border-indigo-500 text-white' 
                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {ratio.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            /* STANDARD ACTIONS */
            <div className="flex gap-2 sm:gap-3 justify-center overflow-x-auto px-2">
                {/* Download */}
                <button 
                onClick={handleDownload}
                className="flex-1 min-w-[60px] max-w-[120px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 px-2 rounded-xl font-medium transition-all border border-slate-700 text-sm"
                title="Save"
                >
                <Download size={18} />
                <span className="hidden sm:inline">Save</span>
                </button>

                {/* Copy (Image Only) */}
                {wallpaper.type === 'image' && (
                    <button 
                        onClick={handleCopy}
                        className="flex-1 min-w-[60px] max-w-[120px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 px-2 rounded-xl font-medium transition-all border border-slate-700 text-sm"
                        title="Copy"
                    >
                        <Copy size={18} />
                        <span className="hidden sm:inline">Copy</span>
                    </button>
                )}

                {/* Share */}
                <button 
                onClick={() => setIsShareMenuOpen(true)}
                className="flex-1 min-w-[60px] max-w-[120px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 px-2 rounded-xl font-medium transition-all border border-slate-700 text-sm"
                title="Share"
                >
                    <Share2 size={18} />
                    <span className="hidden sm:inline">Share</span>
                </button>

                {/* Edit (Image & Video) */}
                <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 min-w-[60px] max-w-[120px] flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 px-2 rounded-xl font-medium transition-all border border-slate-700 text-sm"
                    title="Edit"
                >
                    <Edit2 size={18} />
                    <span className="hidden sm:inline">Edit</span>
                </button>

                {/* Replace Subject */}
                {onReplaceSubject && (
                    <button 
                        onClick={() => {
                            onReplaceSubject(wallpaper);
                            onClose();
                        }}
                        className="flex-1 min-w-[60px] max-w-[120px] flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white py-3 px-2 rounded-xl font-medium transition-all shadow-lg shadow-pink-600/20 text-sm"
                        title="Replace Subject"
                    >
                        <RefreshCw size={18} className="scale-x-[-1]" />
                        <span className="hidden sm:inline">Replace</span>
                    </button>
                )}

                {/* Generate Similar */}
                {onGenerateSimilar && (
                    <button 
                        onClick={() => onGenerateSimilar(wallpaper)}
                        className="flex-1 min-w-[60px] max-w-[120px] flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white py-3 px-2 rounded-xl font-medium transition-all shadow-lg shadow-purple-600/20 text-sm"
                        title="Similar"
                    >
                        <Wand2 size={18} />
                        <span className="hidden sm:inline">Similar</span>
                    </button>
                )}

                {/* Remix */}
                <button 
                onClick={() => {
                    onRemix(wallpaper);
                    onClose();
                }}
                className="flex-1 min-w-[60px] max-w-[120px] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 text-sm"
                title="Remix"
                >
                <RefreshCw size={18} />
                <span className="hidden sm:inline">Remix</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
