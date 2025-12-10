
export interface Wallpaper {
  id: string;
  url: string; // Base64 data URL for images, Blob URL for videos
  prompt: string;
  timestamp: number;
  aspectRatio: AspectRatio;
  chatId: string;
  type: 'image' | 'video';
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string; // Text content
  type: 'text' | 'image_grid';
  images?: Wallpaper[];
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messages: Message[];
}

export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9" | "21:9";
export type ImageSize = "1K" | "2K" | "4K";

export interface GenerationConfig {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  mode: 'image' | 'video';
  duration: number; // seconds
  fps: number;
}

export interface AIOperation {
  done: boolean;
  response?: any;
}
