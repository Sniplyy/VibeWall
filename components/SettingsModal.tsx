
import React from 'react';
import { AspectRatio, ImageSize } from '../types';
import { X, Check, Video, Image as ImageIcon, Clock, Zap } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  imageSize: ImageSize;
  setImageSize: (size: ImageSize) => void;
  isLiveMode: boolean;
  setIsLiveMode: (isLive: boolean) => void;
  duration: number;
  setDuration: (d: number) => void;
  fps: number;
  setFps: (f: number) => void;
}

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
const IMAGE_SIZES: ImageSize[] = ["1K", "2K", "4K"];

// Veo only supports these
const VIDEO_ASPECT_RATIOS: AspectRatio[] = ["9:16", "16:9"];

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  aspectRatio,
  setAspectRatio,
  imageSize,
  setImageSize,
  isLiveMode,
  setIsLiveMode,
  duration,
  setDuration,
  fps,
  setFps
}) => {
  if (!isOpen) return null;

  const handleModeChange = (live: boolean) => {
    setIsLiveMode(live);
    // If switching to live and current ratio is not supported, switch to default 9:16
    if (live && !VIDEO_ASPECT_RATIOS.includes(aspectRatio)) {
        setAspectRatio("9:16");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Generation Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto no-scrollbar">
            {/* Mode Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">Format</label>
                <div className="bg-slate-900 p-1 rounded-xl flex">
                    <button
                        onClick={() => handleModeChange(false)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                            !isLiveMode 
                                ? 'bg-slate-700 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <ImageIcon size={16} />
                        Static Image
                    </button>
                    <button
                        onClick={() => handleModeChange(true)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                            isLiveMode 
                                ? 'bg-indigo-600 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Video size={16} />
                        Live Wallpaper
                    </button>
                </div>
            </div>

          {/* Aspect Ratio */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">Aspect Ratio</label>
            <div className="grid grid-cols-4 gap-2">
              {ASPECT_RATIOS.map((ratio) => {
                  const isDisabled = isLiveMode && !VIDEO_ASPECT_RATIOS.includes(ratio);
                  return (
                    <button
                    key={ratio}
                    disabled={isDisabled}
                    onClick={() => setAspectRatio(ratio)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                        aspectRatio === ratio
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : isDisabled 
                            ? 'bg-slate-800/50 border-slate-700 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                    >
                    {ratio}
                    </button>
                );
              })}
            </div>
          </div>

          {/* Image Size (Hidden for Live Mode) */}
          {!isLiveMode && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">Resolution (Quality)</label>
                <div className="grid grid-cols-3 gap-3">
                {IMAGE_SIZES.map((size) => (
                    <button
                    key={size}
                    onClick={() => setImageSize(size)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                        imageSize === size
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                    >
                    {size}
                    {imageSize === size && <Check size={14} />}
                    </button>
                ))}
                </div>
            </div>
          )}

          {/* Live Wallpaper Specific Settings */}
          {isLiveMode && (
              <div className="space-y-6 pt-2 border-t border-slate-700">
                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                        <Clock size={16} /> Duration
                    </label>
                    <div className="bg-slate-900 p-1 rounded-xl flex">
                         {[5, 10].map(d => (
                             <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                    duration === d
                                    ? 'bg-slate-700 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                             >
                                 {d} Seconds
                             </button>
                         ))}
                    </div>
                  </div>

                  {/* FPS */}
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                        <Zap size={16} /> Frame Rate
                    </label>
                    <div className="bg-slate-900 p-1 rounded-xl flex">
                         {[24, 30, 60].map(f => (
                             <button
                                key={f}
                                onClick={() => setFps(f)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                                    fps === f
                                    ? 'bg-slate-700 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                             >
                                 {f} FPS
                             </button>
                         ))}
                    </div>
                  </div>
                  
                  <p className="text-xs text-indigo-300 bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                        Live Wallpapers take longer to generate (approx. 1-2 mins). Only 9:16 and 16:9 aspect ratios are supported.
                  </p>
              </div>
          )}
        </div>

        <div className="p-4 bg-slate-900/50 flex justify-end">
            <button 
                onClick={onClose}
                className="bg-white text-slate-900 px-6 py-2 rounded-full font-semibold hover:bg-slate-200 transition-colors"
            >
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
