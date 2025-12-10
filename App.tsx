import React, { useState, useEffect, useRef } from 'react';
import { Wallpaper, AspectRatio, ImageSize, ChatSession, Message } from './types';
import { ensureApiKey, promptForApiKey, generateVariations } from './services/geminiService';
import SettingsModal from './components/SettingsModal';
import ImageViewer from './components/ImageViewer';
import ProfileModal from './components/ProfileModal';
import { Sparkles, Settings2, Image as ImageIcon, Loader2, X, Info, Paperclip, Menu, Plus, MessageSquare, Trash2, Bot, User, Video, Film, Edit2, Mic, MicOff, Grid, History, Layers, CheckCircle2, Circle, Share2, Download } from 'lucide-react';

const getAspectRatioClass = (ratio: AspectRatio) => {
  switch (ratio) {
    case "1:1": return "aspect-square";
    case "2:3": return "aspect-[2/3]";
    case "3:2": return "aspect-[3/2]";
    case "3:4": return "aspect-[3/4]";
    case "4:3": return "aspect-[4/3]";
    case "9:16": return "aspect-[9/16]";
    case "16:9": return "aspect-video";
    case "21:9": return "aspect-[21/9]";
    default: return "aspect-[16/9]";
  }
};

const App: React.FC = () => {
  // State
  const [apiKeyReady, setApiKeyReady] = useState<boolean>(false);
  // Chats include messages which include wallpapers
  const [chats, setChats] = useState<ChatSession[]>([
    { id: 'default', title: 'New Chat', timestamp: Date.now(), messages: [] }
  ]);
  const [activeChatId, setActiveChatId] = useState<string>('default');
  const [activeView, setActiveView] = useState<'chat' | 'library'>('chat');

  const [loading, setLoading] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [remixSource, setRemixSource] = useState<Wallpaper | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [selectedWallpaper, setSelectedWallpaper] = useState<Wallpaper | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Library Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());

  // Auth & Profile State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || "Guest";
  });
  const [guestUsage, setGuestUsage] = useState<number>(() => {
    return parseInt(localStorage.getItem('guestUsage') || '0', 10);
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Settings
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [imageSize, setImageSize] = useState<ImageSize>("1K");
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  // Video Settings
  const [duration, setDuration] = useState<number>(5);
  const [fps, setFps] = useState<number>(30);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Voice Input
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Generation Progress
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeGenerationMode, setActiveGenerationMode] = useState<'image' | 'video'>('image');
  
  // Audio Refs
  const audioStart = useRef<HTMLAudioElement | null>(null);
  const audioSuccess = useRef<HTMLAudioElement | null>(null);

  // UI Helpers
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Active chat accessor
  const currentChat = chats.find(c => c.id === activeChatId) || chats[0];

  // Derived Library Data
  const allMedia = chats.flatMap(chat => 
    chat.messages.flatMap(msg => msg.images || [])
  ).sort((a, b) => b.timestamp - a.timestamp);

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeView === 'chat') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChat.messages.length, loading, activeView]);

  // Initialization
  useEffect(() => {
    checkKey();
    
    // Initialize simple sounds
    audioStart.current = new Audio("data:audio/wav;base64,UklGRl9vT1ZQRZFfmtTCwrV+fXx7fH1+f4CAgIGBgYKCgoODg4SEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhIQ=");
    audioSuccess.current = new Audio("data:audio/wav;base64,UklGRl9vT1ZQRZFfmtTCwrV+fXx7fH1+f4CAgIGBgYKCgoODg4SEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhISEhIQ=");
  }, []);

  // Reset selection mode when changing views
  useEffect(() => {
    if (activeView !== 'library') {
      setIsSelectionMode(false);
      setSelectedMediaIds(new Set());
    }
  }, [activeView]);

  // Persist Auth State
  useEffect(() => {
    localStorage.setItem('isLoggedIn', String(isLoggedIn));
    localStorage.setItem('userName', userName);
    localStorage.setItem('guestUsage', String(guestUsage));
  }, [isLoggedIn, userName, guestUsage]);

  // Progress simulation for video generation
  useEffect(() => {
    let interval: any;
    if (loading && activeGenerationMode === 'video') {
      setLoadingProgress(0);
      const startTime = Date.now();
      
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        let newProgress = 0;
        if (elapsed < 10000) {
            newProgress = (elapsed / 10000) * 30;
        } else if (elapsed < 30000) {
            newProgress = 30 + ((elapsed - 10000) / 20000) * 40;
        } else if (elapsed < 60000) {
            newProgress = 70 + ((elapsed - 30000) / 30000) * 20;
        } else {
            newProgress = 90 + (1 - Math.exp(-(elapsed - 60000) / 20000)) * 9;
        }
        setLoadingProgress(Math.min(newProgress, 99));
      }, 100);
    } else {
      setLoadingProgress(0);
    }
    return () => clearInterval(interval);
  }, [loading, activeGenerationMode]);

  const checkKey = async () => {
    try {
      const ready = await ensureApiKey();
      setApiKeyReady(ready);
    } catch (e) {
      console.error("Error checking API key status", e);
    }
  };

  const handleSelectKey = async () => {
    await promptForApiKey();
    setApiKeyReady(true);
  };

  const handleLogin = (provider: string) => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
          setIsLoggedIn(true);
          setUserName("Pro User"); // Mock user name
          setLoading(false);
          setIsProfileOpen(false);
      }, 1000);
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      setUserName("Guest");
      // Note: We do NOT reset guestUsage here, as per requirement to force login after using free credits
      setIsProfileOpen(false);
  };

  const handleCreateChat = () => {
    const newChat: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      timestamp: Date.now(),
      messages: []
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setActiveView('chat');
    setPrompt('');
    setRemixSource(null);
    setUploadedImages([]);
    setIsLiveMode(false); // Reset to default
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    const newChats = chats.filter(c => c.id !== chatId);
    if (newChats.length === 0) {
      const defaultChat = { id: crypto.randomUUID(), title: 'New Chat', timestamp: Date.now(), messages: [] };
      setChats([defaultChat]);
      setActiveChatId(defaultChat.id);
    } else {
      setChats(newChats);
      if (activeChatId === chatId) {
        setActiveChatId(newChats[0].id);
      }
    }
  };

  const handleJumpToChat = () => {
    if (selectedWallpaper) {
        setActiveChatId(selectedWallpaper.chatId);
        setActiveView('chat');
        setSelectedWallpaper(null);
    }
  };

  // Library Selection Logic
  const toggleSelectionMode = () => {
      if (isSelectionMode) {
          setIsSelectionMode(false);
          setSelectedMediaIds(new Set());
      } else {
          setIsSelectionMode(true);
      }
  };

  const toggleMediaSelection = (id: string) => {
      const newSelection = new Set(selectedMediaIds);
      if (newSelection.has(id)) {
          newSelection.delete(id);
      } else {
          newSelection.add(id);
      }
      setSelectedMediaIds(newSelection);
  };

  const handleBulkDelete = () => {
      if (selectedMediaIds.size === 0) return;
      
      if (!confirm(`Delete ${selectedMediaIds.size} item(s)?`)) return;

      setChats(prevChats => prevChats.map(chat => ({
          ...chat,
          messages: chat.messages.map(msg => ({
              ...msg,
              // Filter out selected images
              images: msg.images ? msg.images.filter(img => !selectedMediaIds.has(img.id)) : undefined
          }))
      })));

      setSelectedMediaIds(new Set());
      setIsSelectionMode(false);
  };

  const handleBulkShare = async () => {
      if (selectedMediaIds.size === 0) return;

      const itemsToShare = allMedia.filter(m => selectedMediaIds.has(m.id));
      
      try {
          const files = await Promise.all(itemsToShare.map(async (item) => {
              const res = await fetch(item.url);
              const blob = await res.blob();
              const ext = item.type === 'video' ? 'mp4' : 'png';
              const mime = item.type === 'video' ? 'video/mp4' : 'image/png';
              return new File([blob], `vibewall-${item.id}.${ext}`, { type: mime });
          }));

          if (navigator.canShare && navigator.canShare({ files })) {
              await navigator.share({
                  files,
                  title: 'VibeWall Shared Media',
                  text: `Check out these ${files.length} generations!`
              });
          } else {
              // Fallback to sequential download with delay to prevent blocking
              files.forEach((file, index) => {
                  setTimeout(() => {
                    const url = URL.createObjectURL(file);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }, index * 500);
              });
          }
      } catch (e) {
          console.error("Bulk share failed", e);
      }
      
      setIsSelectionMode(false);
      setSelectedMediaIds(new Set());
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | FileList | File[]) => {
    let files: File[] = [];
    
    if (e instanceof FileList) {
        files = Array.from(e);
    } else if (Array.isArray(e)) {
        files = e;
    } else if (e.target.files) {
        files = Array.from(e.target.files);
    }

    if (files.length === 0) return;

    // Filter images
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    // Limit to 3 total
    const remainingSlots = 3 - uploadedImages.length;
    const filesToProcess = imageFiles.slice(0, remainingSlots);

    if (filesToProcess.length === 0 && uploadedImages.length >= 3) {
        alert("Maximum 3 reference images allowed.");
        return;
    }

    filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            setUploadedImages(prev => {
                if (prev.length >= 3) return prev;
                // Removed the forced auto-switch to Live Mode so users can choose
                return [...prev, result];
            });
            setRemixSource(null);
        };
        reader.readAsDataURL(file);
    });

    // Reset input if event
    if (e && 'target' in e && e.target) {
         e.target.value = '';
    }

    if (inputRef.current) {
        inputRef.current.focus();
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleFileUpload(e.dataTransfer.files);
      }
  };

  const removeUploadedImage = (index: number) => {
      setUploadedImages(prev => {
          const newImages = prev.filter((_, i) => i !== index);
          return newImages;
      });
  };

  const toggleListening = () => {
    if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice input is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        setIsListening(true);
    };

    recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result) => result.transcript)
            .join('');
        setPrompt(transcript);
    };

    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            alert("Microphone permission was denied. Please allow microphone access in your browser settings to use voice input.");
        }
        setIsListening(false);
    };

    recognition.onend = () => {
        setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const addMessageToChat = (chatId: string, message: Message) => {
    setChats(prev => prev.map(c => 
        c.id === chatId 
        ? { ...c, messages: [...c.messages, message] } 
        : c
    ));
  };

  const updateChatTitle = (chatId: string, promptText: string) => {
    setChats(prev => prev.map(c => {
        if (c.id === chatId && (c.title === 'New Chat' || c.title === 'New Collection')) {
            return { ...c, title: promptText.length > 30 ? promptText.substring(0, 30) + '...' : promptText };
        }
        return c;
    }));
  };

  const playSound = (type: 'start' | 'success') => {
      try {
          if (type === 'start' && audioStart.current) {
              audioStart.current.currentTime = 0;
              audioStart.current.play().catch(() => {});
          } else if (type === 'success' && audioSuccess.current) {
              audioSuccess.current.currentTime = 0;
              audioSuccess.current.play().catch(() => {});
          }
      } catch (e) {
          // Ignore audio errors
      }
  };

  const handleGenerate = async (
    e?: React.FormEvent, 
    overrideParams?: { 
        prompt: string, 
        aspectRatio: AspectRatio, 
        mode: 'image' | 'video',
        referenceImages?: string[] | null
    }
  ) => {
    if (e) e.preventDefault();
    if (loading) return;

    // --- CHECK USER LIMITS ---
    if (!isLoggedIn) {
        if (guestUsage >= 2) {
            setIsProfileOpen(true);
            const warningMsg: Message = { 
                id: crypto.randomUUID(), 
                role: 'model', 
                content: "You have reached the free limit for guest users. Please sign in to continue generating.", 
                type: 'text' 
            };
            addMessageToChat(activeChatId, warningMsg);
            return;
        }
        // Increment usage for guest
        setGuestUsage(prev => prev + 1);
    }

    // Use overrides or fallback to state
    const promptToUse = overrideParams?.prompt ?? prompt;
    const ratioToUse = overrideParams?.aspectRatio ?? aspectRatio;
    const modeToUse = overrideParams?.mode ?? (isLiveMode ? 'video' : 'image');
    // For reference image: passed override, or uploadedImages state, or remixSource url
    let referenceToUse: string[] = [];
    if (overrideParams?.referenceImages !== undefined) {
        referenceToUse = overrideParams.referenceImages || [];
    } else if (uploadedImages.length > 0) {
        referenceToUse = uploadedImages;
    } else if (remixSource) {
        referenceToUse = [remixSource.url];
    }

    if (!promptToUse.trim() && referenceToUse.length === 0) return;

    if (!apiKeyReady) {
        await handleSelectKey();
    }

    // Play start sound
    playSound('start');

    setActiveGenerationMode(modeToUse);
    setLoading(true);
    
    // Construct prompt
    let finalPrompt = promptToUse.trim();
    if (referenceToUse.length > 0 && !finalPrompt) {
        finalPrompt = modeToUse === 'video' 
            ? (referenceToUse.length > 1 ? "Combine these images into a video" : "Transform this into a live wallpaper")
            : (referenceToUse.length > 1 ? "Combine these images into a cohesive composition" : "Variation of this image");
    }

    // 1. Add User Message
    const userMsgId = crypto.randomUUID();
    const userMessage: Message = {
        id: userMsgId,
        role: 'user',
        content: finalPrompt,
        type: referenceToUse.length > 0 ? 'image_grid' : 'text',
        images: referenceToUse.length > 0 ? referenceToUse.map((url, i) => ({
            id: `ref-${userMsgId}-${i}`,
            url: url,
            prompt: `Reference ${i+1}`,
            timestamp: Date.now(),
            aspectRatio: '1:1',
            chatId: activeChatId,
            type: 'image'
        })) : undefined
    };
    addMessageToChat(activeChatId, userMessage);
    updateChatTitle(activeChatId, finalPrompt);

    // Clear inputs immediately if not using overrides (standard flow)
    if (!overrideParams) {
        setPrompt('');
        setRemixSource(null);
        setUploadedImages([]);
    }

    try {
      const generatedResults = await generateVariations(
        finalPrompt, 
        { aspectRatio: ratioToUse, imageSize, mode: modeToUse, duration, fps }, 
        referenceToUse.length > 0 ? referenceToUse : undefined
      );

      const newWallpapers: Wallpaper[] = generatedResults.map((res) => ({
        id: crypto.randomUUID(),
        url: res.url,
        prompt: finalPrompt,
        timestamp: Date.now(),
        aspectRatio: ratioToUse, // Note: video might force 16:9 if multi-image
        chatId: activeChatId,
        type: res.type
      }));

      // 2. Add Model Response
      const modelMessage: Message = {
          id: crypto.randomUUID(),
          role: 'model',
          content: modeToUse === 'video'
            ? `Here is your live wallpaper based on "${finalPrompt}" (${duration}s @ ${fps}fps)` 
            : `Here are 4 variations based on "${finalPrompt}"`,
          type: 'image_grid',
          images: newWallpapers
      };
      addMessageToChat(activeChatId, modelMessage);
      
      // Play success sound
      playSound('success');

    } catch (error: any) {
      if (error.message === 'API_KEY_INVALID') {
        setApiKeyReady(false);
        const errorMsg: Message = { id: crypto.randomUUID(), role: 'model', content: "Please select a valid API Key to continue.", type: 'text' };
        addMessageToChat(activeChatId, errorMsg);
      } else {
        console.error(error);
        const errorMsg: Message = { id: crypto.randomUUID(), role: 'model', content: `Sorry, I couldn't generate that. ${error.message || ''}`, type: 'text' };
        addMessageToChat(activeChatId, errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemix = (wallpaper: Wallpaper) => {
    // If we're in library view, switch to the chat view for remixing context
    setActiveView('chat');
    if (wallpaper.type === 'video') {
        setPrompt(`Variation of previous live wallpaper: ${wallpaper.prompt}`);
    } else {
        setRemixSource(wallpaper);
        setUploadedImages([]); // Clear other uploads if remixing specific image
    }
    if (inputRef.current) {
        inputRef.current.focus();
    }
  };
  
  const handleGenerateSimilar = (wallpaper: Wallpaper) => {
      // 1. Close Viewer
      setSelectedWallpaper(null);
      // 2. Switch to chat
      setActiveView('chat');
      // 3. Update UI state to reflect what we are doing
      setPrompt(wallpaper.prompt);
      setAspectRatio(wallpaper.aspectRatio);
      const isVideo = wallpaper.type === 'video';
      setIsLiveMode(isVideo);
      setRemixSource(null);
      setUploadedImages([]);

      // 4. Trigger generation immediately
      handleGenerate(undefined, {
          prompt: wallpaper.prompt,
          aspectRatio: wallpaper.aspectRatio,
          mode: isVideo ? 'video' : 'image',
          referenceImages: null
      });
  };

  const handleEditMessage = (messageId: string, content: string, images?: Wallpaper[]) => {
    setPrompt(content);
    if (images && images.length > 0) {
        setUploadedImages(images.map(img => img.url));
    }
    setChats(prev => prev.map(c => {
        if (c.id === activeChatId) {
            const msgIndex = c.messages.findIndex(m => m.id === messageId);
            if (msgIndex !== -1) {
                return {
                    ...c,
                    messages: c.messages.slice(0, msgIndex)
                };
            }
        }
        return c;
    }));
    if (inputRef.current) {
        inputRef.current.focus();
    }
  };

  const lastUserMessageIndex = currentChat.messages.map(m => m.role).lastIndexOf('user');

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden relative font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="p-4 flex items-center justify-between border-b border-white/5 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">VibeWall</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Primary Navigation */}
        <div className="p-3 space-y-2">
          <button 
            onClick={handleCreateChat}
            className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>

          <button 
            onClick={() => {
                setActiveView('library');
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeView === 'library'
                ? 'bg-slate-800 text-white border border-white/10'
                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
            }`}
          >
            <Grid size={18} />
            <span>Library</span>
          </button>
        </div>

        {/* Chat History List */}
        <div className="px-4 pb-2 pt-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            History
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 no-scrollbar">
              {chats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setActiveView('chat');
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={`w-full group flex items-center justify-between p-3 rounded-lg text-sm transition-all text-left ${
                    activeView === 'chat' && activeChatId === chat.id 
                      ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 shadow-sm' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <MessageSquare size={16} className={activeView === 'chat' && activeChatId === chat.id ? "text-indigo-400" : "text-slate-600"} />
                    <span className="truncate">{chat.title}</span>
                  </div>
                  <div 
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 ${
                        activeChatId === chat.id ? 'opacity-0' : '' 
                    }`}
                  >
                    <Trash2 size={14} />
                  </div>
                </button>
              ))}
        </div>

        <div className="border-t border-white/5 bg-slate-900/50">
            {/* Status Line */}
            <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>SYSTEM STATUS</span>
              {apiKeyReady ? (
                 <span className="flex items-center gap-1 text-green-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    ONLINE
                 </span>
              ) : (
                 <button onClick={handleSelectKey} className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300">
                    <Info size={10} />
                    KEY NEEDED
                 </button>
              )}
            </div>

            {/* Profile Button */}
            <button 
                onClick={() => setIsProfileOpen(true)}
                className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors text-left group"
            >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold shadow-lg group-hover:scale-105 transition-transform">
                    {userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate group-hover:text-indigo-300 transition-colors">{userName}</div>
                    <div className="text-xs text-slate-400 truncate">
                        {isLoggedIn ? "Premium Plus" : `${2 - Math.min(guestUsage, 2)} free credits`}
                    </div> 
                </div>
                <Settings2 size={16} className="text-slate-600 group-hover:text-white transition-colors" />
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-white/5 px-4 h-16 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors lg:hidden"
                >
                    <Menu size={22} />
                </button>
                <h2 className="font-medium text-slate-200 truncate max-w-[200px] sm:max-w-md flex items-center gap-2">
                    {activeView === 'library' ? (
                        <>
                            <Grid size={18} className="text-indigo-400" />
                            Your Library
                        </>
                    ) : (
                        currentChat.title
                    )}
                </h2>
            </div>
            
            {/* Library Selection Toggle */}
            {activeView === 'library' && (
                <div className="flex items-center gap-2">
                     {isSelectionMode && allMedia.length > 0 && (
                        <button
                            onClick={() => {
                                if (selectedMediaIds.size === allMedia.length) {
                                    setSelectedMediaIds(new Set());
                                } else {
                                    setSelectedMediaIds(new Set(allMedia.map(m => m.id)));
                                }
                            }}
                            className="text-xs font-medium text-slate-400 hover:text-white transition-colors mr-2 px-2 py-1 rounded hover:bg-white/5"
                        >
                            {selectedMediaIds.size === allMedia.length ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                    <button
                        onClick={toggleSelectionMode}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isSelectionMode 
                            ? 'bg-slate-800 text-white' 
                            : 'text-indigo-400 hover:bg-indigo-500/10'
                        }`}
                    >
                        {isSelectionMode ? 'Cancel' : 'Select'}
                    </button>
                </div>
            )}
            
            {/* Show settings only in chat view or always? Usually chat specific. */}
            {activeView === 'chat' && (
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors relative"
                >
                    <Settings2 size={22} />
                    {isLiveMode && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-slate-950"></span>
                    )}
                </button>
            )}
        </header>

        {/* Content Area Switcher */}
        {activeView === 'library' ? (
            /* LIBRARY GRID VIEW */
            <main className="flex-1 overflow-y-auto pt-20 pb-4 px-4 scroll-smooth">
                <div className="container mx-auto pb-20">
                    {allMedia.length === 0 ? (
                        <div className="flex flex-col items-center justify-center mt-32 text-center px-6 opacity-60">
                             <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800">
                                 <Grid size={40} className="text-slate-600" />
                             </div>
                             <h3 className="text-xl font-semibold mb-2">Library is empty</h3>
                             <p className="text-slate-400 max-w-sm">
                                 Generated images and videos will appear here. Start a chat to create something new!
                             </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {allMedia.map((media, idx) => {
                                const isSelected = selectedMediaIds.has(media.id);
                                return (
                                <button
                                    key={`${media.id}-${idx}`}
                                    onClick={() => {
                                        if (isSelectionMode) {
                                            toggleMediaSelection(media.id);
                                        } else {
                                            setSelectedWallpaper(media);
                                        }
                                    }}
                                    className={`
                                        group relative rounded-xl overflow-hidden border shadow-lg bg-slate-900 transition-all hover:scale-[1.02]
                                        ${isSelected 
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/50' 
                                            : 'border-white/5 hover:border-indigo-500/50 hover:shadow-indigo-500/10'
                                        }
                                        ${getAspectRatioClass(media.aspectRatio)}
                                    `}
                                >
                                     {media.type === 'video' ? (
                                        <>
                                            <video 
                                                src={media.url} 
                                                className="w-full h-full object-cover"
                                                muted 
                                            />
                                            <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm shadow-sm">
                                                <Video size={12} />
                                            </div>
                                        </>
                                     ) : (
                                        <img 
                                            src={media.url} 
                                            alt={media.prompt} 
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                     )}
                                     
                                     {/* Overlay info - Only show if NOT in selection mode */}
                                     {!isSelectionMode && (
                                         <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end text-left">
                                             <p className="text-xs text-white line-clamp-2 font-medium drop-shadow-md">{media.prompt}</p>
                                         </div>
                                     )}

                                     {/* Selection Overlay */}
                                     {isSelectionMode && (
                                         <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                             {isSelected ? (
                                                 <CheckCircle2 className="text-indigo-500 fill-white" size={32} />
                                             ) : (
                                                 <Circle className="text-white/70" size={32} />
                                             )}
                                         </div>
                                     )}
                                </button>
                            )})}
                        </div>
                    )}
                </div>

                {/* Bulk Actions Floating Bar */}
                {isSelectionMode && selectedMediaIds.size > 0 && (
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30 animate-in slide-in-from-bottom-4">
                        <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
                            <span className="text-sm font-semibold text-white mr-2">
                                {selectedMediaIds.size} selected
                            </span>
                            <div className="h-6 w-px bg-slate-700"></div>
                            <button 
                                onClick={handleBulkShare}
                                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                            >
                                <Share2 size={18} />
                                <span className="text-sm font-medium">Share</span>
                            </button>
                            <button 
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                            >
                                <Trash2 size={18} />
                                <span className="text-sm font-medium">Delete</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>
        ) : (
            /* CHAT VIEW */
            <main className="flex-1 overflow-y-auto pt-20 pb-32 px-4 scroll-smooth">
                <div className="container mx-auto max-w-4xl flex flex-col gap-6">
                    
                    {/* Empty State */}
                    {currentChat.messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center mt-20 text-center px-6 opacity-60">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-800">
                                <Bot size={32} className="text-slate-600" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">How can I help you design?</h3>
                            <p className="text-slate-400 max-w-sm">
                                Describe the wallpaper you want, upload a reference, or try the new Live Wallpaper mode in settings.
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    {currentChat.messages.map((msg, index) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {/* Avatar (Model Only) */}
                            {msg.role === 'model' && (
                                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-indigo-600/20">
                                    <Sparkles size={14} className="text-white" />
                                </div>
                            )}

                            <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {/* Text Bubble */}
                                {msg.content && (
                                    <div className={`
                                        relative group
                                        py-3 px-4 rounded-2xl text-sm leading-relaxed
                                        ${msg.role === 'user' 
                                            ? 'bg-slate-800 text-slate-100 rounded-tr-sm border border-slate-700' 
                                            : 'bg-transparent text-slate-300 px-0 py-1'
                                        }
                                    `}>
                                        {msg.content}
                                        
                                        {/* Edit Button for Last User Message */}
                                        {msg.role === 'user' && index === lastUserMessageIndex && (
                                            <button
                                                onClick={() => handleEditMessage(msg.id, msg.content, msg.images)}
                                                className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-all border border-slate-700 shadow-sm"
                                                title="Edit Prompt"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Reference Images (User) */}
                                {msg.role === 'user' && msg.images && msg.images.length > 0 && (
                                    <div className="mt-1 flex gap-2 flex-wrap justify-end">
                                        {msg.images.map((img, i) => (
                                            <img 
                                                key={i}
                                                src={img.url} 
                                                alt={`Reference ${i}`} 
                                                className="w-32 h-32 object-cover rounded-xl border border-slate-700 shadow-md opacity-80" 
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Generated Images Grid (Model) */}
                                {msg.role === 'model' && msg.images && msg.images.length > 0 && (
                                    <div className={`grid gap-3 mt-2 w-full ${
                                        msg.images.length === 1 ? 'grid-cols-1 max-w-xs' : 'grid-cols-2'
                                    }`}>
                                        {msg.images.map((img) => (
                                            <button 
                                                key={img.id}
                                                onClick={() => setSelectedWallpaper(img)}
                                                className={`
                                                    group relative overflow-hidden rounded-xl bg-slate-900 border border-white/5 shadow-xl transition-all hover:scale-[1.02]
                                                    ${getAspectRatioClass(img.aspectRatio)}
                                                `}
                                            >
                                                {img.type === 'video' ? (
                                                    <>
                                                        <video 
                                                            src={img.url} 
                                                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                            muted
                                                            loop
                                                            autoPlay
                                                            playsInline
                                                        />
                                                        <div className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm">
                                                            <Video size={14} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <img 
                                                        src={img.url} 
                                                        alt={img.prompt} 
                                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                                        loading="lazy"
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex gap-4 justify-start">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1 animate-pulse">
                                <Sparkles size={14} className="text-white" />
                            </div>
                            <div className="flex flex-col gap-3 max-w-[85%] w-full">
                                {activeGenerationMode === 'video' ? (
                                    <div className="flex flex-col gap-2 w-full max-w-xs pt-1">
                                        <div className="flex justify-between text-xs text-slate-400 font-medium">
                                            <span>Creating video...</span>
                                            <span>{Math.round(loadingProgress)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className="h-full bg-indigo-500 transition-all duration-300 ease-out relative"
                                                style={{ width: `${loadingProgress}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-500">
                                            Generating high-quality video usually takes about a minute.
                                        </p>
                                        {/* Video Skeleton */}
                                        <div className={`${getAspectRatioClass(aspectRatio)} bg-slate-900/50 rounded-xl animate-pulse border border-white/5 flex items-center justify-center mt-2`}>
                                             <Film className="text-slate-800 animate-bounce" size={24} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm text-slate-400 animate-pulse">
                                            Generating variations...
                                        </div>
                                        <div className={`grid gap-3 w-full grid-cols-2 max-w-md`}>
                                            {Array.from({ length: 4 }).map((_, i) => (
                                                <div key={`skel-${i}`} className={`${getAspectRatioClass(aspectRatio)} bg-slate-900/50 rounded-xl animate-pulse border border-white/5 flex items-center justify-center`}>
                                                    <Sparkles className="text-slate-800 animate-bounce" size={24} />
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div ref={chatEndRef} />
                </div>
            </main>
        )}

        {/* Input Area (Only in Chat View) */}
        {activeView === 'chat' && (
            <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-10">
                <div className="container mx-auto max-w-3xl">
                    {/* Reference Images Preview */}
                    {((remixSource && uploadedImages.length === 0) || uploadedImages.length > 0) && (
                        <div className="flex items-center gap-2 mb-3 animate-in slide-in-from-bottom-2 flex-wrap">
                            {/* Single Remix Source */}
                            {remixSource && uploadedImages.length === 0 && (
                                <div className="flex items-center gap-3 bg-indigo-900/30 border border-indigo-500/30 p-2 rounded-lg w-fit backdrop-blur-md">
                                    <img src={remixSource.url} alt="Reference" className="w-8 h-14 object-cover rounded shadow-sm" />
                                    <div className="flex flex-col">
                                        <span className="text-xs text-indigo-200 font-medium">Remixing image</span>
                                        <span className="text-[10px] text-indigo-300/70">Using as reference</span>
                                    </div>
                                    <button 
                                        onClick={() => setRemixSource(null)}
                                        className="ml-2 p-1 hover:bg-white/10 rounded-full text-indigo-300 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Uploaded Images List */}
                            {uploadedImages.map((img, idx) => (
                                <div key={idx} className="relative group">
                                    <img src={img} alt={`Ref ${idx}`} className="w-12 h-16 object-cover rounded-lg border border-indigo-500/30 shadow-sm" />
                                    <button 
                                        onClick={() => removeUploadedImage(idx)}
                                        className="absolute -top-1.5 -right-1.5 bg-slate-800 rounded-full text-white p-0.5 border border-slate-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}

                            {uploadedImages.length > 0 && (
                                <div className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                                    {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} added
                                    {uploadedImages.length > 1 && isLiveMode && " (Video Mode)"}
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Live Mode Indicator (Small pill above input) */}
                    {isLiveMode && (
                        <div className="flex justify-end mb-2 mr-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                Live Mode Active
                            </span>
                        </div>
                    )}

                    <form 
                        onSubmit={handleGenerate} 
                        className={`
                            flex gap-2 relative transition-all duration-300
                            ${isDragOver ? 'scale-[1.02] brightness-125' : ''}
                        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {/* Drag Overlay */}
                        {isDragOver && (
                            <div className="absolute inset-0 z-50 bg-indigo-500/20 border-2 border-indigo-500 border-dashed rounded-2xl flex items-center justify-center backdrop-blur-sm pointer-events-none">
                                <div className="text-white font-bold text-lg flex items-center gap-2">
                                    <Layers size={24} />
                                    Drop images here
                                </div>
                            </div>
                        )}

                        <input 
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleFileUpload(e)}
                        />
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square h-auto w-12 rounded-2xl flex items-center justify-center transition-all bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Add images"
                        >
                            <Paperclip size={20} />
                        </button>

                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`aspect-square h-auto w-12 rounded-2xl flex items-center justify-center transition-all border ${
                                isListening 
                                ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' 
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700'
                            }`}
                            title="Voice Input"
                        >
                            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>

                        <input
                            ref={inputRef}
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={
                                isListening
                                    ? "Listening..."
                                    : isLiveMode 
                                        ? (remixSource || uploadedImages.length > 0 ? "Transform these images..." : "Describe a live wallpaper...") 
                                        : (remixSource || uploadedImages.length > 0 ? "Describe changes..." : "Describe your vibe...")
                            }
                            className={`
                                flex-1 bg-slate-800/80 border text-white placeholder:text-slate-500 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 transition-all shadow-inner backdrop-blur-sm
                                ${isLiveMode 
                                    ? 'border-indigo-500/30 focus:ring-indigo-500/50' 
                                    : 'border-slate-700 focus:ring-indigo-500/50'
                                }
                            `}
                            disabled={loading}
                        />
                        <button
                            type="submit"
                            disabled={loading || (!prompt && !remixSource && uploadedImages.length === 0)}
                            className={`
                                aspect-square h-auto w-14 rounded-2xl flex items-center justify-center transition-all shadow-lg
                                ${loading || (!prompt && !remixSource && uploadedImages.length === 0)
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : isLiveMode 
                                        ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-600/30 hover:scale-105 active:scale-95'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/30 hover:scale-105 active:scale-95'
                                }
                            `}
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : (isLiveMode ? <Video size={24} /> : <Sparkles size={24} />)}
                        </button>
                    </form>
                </div>
            </div>
        )}
      </div>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        imageSize={imageSize}
        setImageSize={setImageSize}
        isLiveMode={isLiveMode}
        setIsLiveMode={setIsLiveMode}
        duration={duration}
        setDuration={setDuration}
        fps={fps}
        setFps={setFps}
      />
      
      <ProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userName={userName}
        setUserName={setUserName}
        apiKeyReady={apiKeyReady}
        onManageApiKey={handleSelectKey}
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <ImageViewer 
        wallpaper={selectedWallpaper}
        onClose={() => setSelectedWallpaper(null)}
        onRemix={handleRemix}
        onJumpToChat={activeView === 'library' ? handleJumpToChat : undefined}
        onGenerateSimilar={handleGenerateSimilar}
      />
      
    </div>
  );
};

export default App;