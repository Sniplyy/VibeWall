
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageSize } from "../types";

// Helper for delays
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to check and prompt for API key
export const ensureApiKey = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
        return false;
    }
    return true;
  }
  return true; // Fallback if not running in the specific environment
};

export const promptForApiKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
        await window.aistudio.openSelectKey();
    }
};

const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';
const VIDEO_FAST_MODEL_NAME = 'veo-3.1-fast-generate-preview';
const VIDEO_MULTI_REF_MODEL_NAME = 'veo-3.1-generate-preview';

// Robustly extract error message from various error object shapes
const getErrorMessage = (error: any): string => {
    if (!error) return "Unknown error";
    if (typeof error === 'string') return error;
    
    // Check for standard Error object
    let msg = error.message || '';
    
    // Check for API error response shape: { error: { code, message, status } }
    if (error.error) {
        if (error.error.message) msg += " " + error.error.message;
        if (error.error.code) msg += " " + error.error.code;
        if (error.error.status) msg += " " + error.error.status;
    }
    
    // Fallback to stringify if empty so far
    if (!msg) {
        try {
            msg = JSON.stringify(error);
        } catch (e) {
            msg = String(error);
        }
    }
    
    return msg;
};

const extractBase64AndMime = (dataUrl: string) => {
    let mimeType = 'image/png';
    let data = dataUrl;

    const match = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
        mimeType = match[1];
        data = match[2];
    } else {
        const splitParts = dataUrl.split(',');
        if (splitParts.length === 2) {
            data = splitParts[1];
            const mimeMatch = splitParts[0].match(/:(.*?);/);
            if (mimeMatch) {
                mimeType = mimeMatch[1];
            }
        }
    }
    return { mimeType, data };
};

export const generateWallpaper = async (
  prompt: string,
  config: { aspectRatio: AspectRatio; imageSize: ImageSize },
  referenceImages?: string[]
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_INVALID");
  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [];
  
  // Add all reference images
  if (referenceImages && referenceImages.length > 0) {
    referenceImages.forEach(img => {
        const { mimeType, data } = extractBase64AndMime(img);
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: data
            }
        });
    });
  }

  parts.push({ text: prompt });

  let response;
  let attempts = 0;
  const maxAttempts = 15; // Extremely high retry count for persistence

  while (true) {
      try {
        response = await ai.models.generateContent({
            model: IMAGE_MODEL_NAME,
            contents: { parts },
            config: {
                imageConfig: {
                aspectRatio: config.aspectRatio,
                imageSize: config.imageSize,
                },
            },
        });
        break; // Success
      } catch (error: any) {
        attempts++;
        const errorMessage = getErrorMessage(error);
        
        // Handle API Key errors (fail fast)
        if (
            errorMessage.includes("Requested entity was not found") || 
            errorMessage.includes("PERMISSION_DENIED") ||
            errorMessage.includes("403") && !errorMessage.includes("overloaded") // Distinction: sometimes 403 is permission, sometimes it's capacity
        ) {
             if (errorMessage.includes("caller does not have permission")) {
                 console.error("API Key Error:", error);
                 throw new Error("API_KEY_INVALID");
             }
        }
        
        // Handle Quota errors (fail fast)
        if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
             throw new Error("Generation quota exceeded. Please check your plan or try again later.");
        }

        // Retry conditions: 503, 500, 502, 504, overloaded, UNAVAILABLE, INTERNAL
        const isRetryable = 
            errorMessage.includes("503") || 
            errorMessage.includes("overloaded") || 
            errorMessage.includes("UNAVAILABLE") ||
            errorMessage.includes("500") ||
            errorMessage.includes("INTERNAL") ||
            errorMessage.includes("Internal error") ||
            errorMessage.includes("502") || 
            errorMessage.includes("504");

        if (isRetryable && attempts <= maxAttempts) {
            // Aggressive backoff: Start at 10 seconds.
            const baseDelay = 10000 * Math.pow(1.5, attempts - 1);
            const cappedDelay = Math.min(baseDelay, 90000); // Cap at 90s
            const jitter = Math.random() * 5000;
            const delayMs = cappedDelay + jitter;
            
            console.warn(`Attempt ${attempts}/${maxAttempts} failed: ${errorMessage}. Retrying in ${Math.round(delayMs/1000)}s...`);
            await wait(delayMs);
            continue;
        }

        console.error("Generation failed final:", error);
        throw error;
      }
  }

  if (response.candidates && response.candidates.length > 0) {
    const firstCandidate = response.candidates[0];
    // Check if content and parts exist before iterating
    if (firstCandidate.content && Array.isArray(firstCandidate.content.parts)) {
        for (const part of firstCandidate.content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
  }
  
  console.error("Invalid response structure:", JSON.stringify(response, null, 2));
  throw new Error("No image data found in response. The content may have been blocked by safety settings.");
};

export const generateLiveWallpaper = async (
    prompt: string,
    config: { aspectRatio: AspectRatio; duration: number; fps: number },
    referenceImages?: string[]
): Promise<string> => {
    // Capture API Key locally to ensure it's available for both SDK and REST fallback
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY_INVALID");
    
    const ai = new GoogleGenAI({ apiKey });
    
    // Determine if we are doing multi-image generation
    const isMultiImage = referenceImages && referenceImages.length > 1;

    // Model selection
    const model = isMultiImage ? VIDEO_MULTI_REF_MODEL_NAME : VIDEO_FAST_MODEL_NAME;

    // Veo config logic
    // For single image (Fast model): Supports 9:16 or 16:9.
    // For multi-image (Std model): MUST be 16:9 and 720p.
    
    let videoConfig: any = {
        numberOfVideos: 1,
    };

    if (isMultiImage) {
        videoConfig.resolution = '720p';
        videoConfig.aspectRatio = '16:9';
    } else {
        videoConfig.resolution = '720p';
         // Fallback logic for single image aspect ratio
        let veoAspectRatio = '9:16';
        if (config.aspectRatio === '16:9' || config.aspectRatio === '21:9' || config.aspectRatio === '3:2' || config.aspectRatio === '4:3') {
            veoAspectRatio = '16:9';
        } else {
            veoAspectRatio = '9:16';
        }
        videoConfig.aspectRatio = veoAspectRatio;
    }

    let operation;
    
    // Modify prompt to include duration and fps info if it helps the model context
    const enhancedPrompt = `${prompt}. Create a smooth, high-quality video with a duration of approx ${config.duration} seconds at ${config.fps}fps.`;

    try {
        if (isMultiImage && referenceImages) {
            // Multi-image payload construction
            const referenceImagesPayload = referenceImages.map(img => {
                const { mimeType, data } = extractBase64AndMime(img);
                return {
                    image: {
                        imageBytes: data,
                        mimeType: mimeType,
                    },
                    referenceType: 'ASSET' // Using string literal as per SDK usage
                };
            });

            operation = await ai.models.generateVideos({
                model: model,
                prompt: enhancedPrompt,
                config: {
                    ...videoConfig,
                    referenceImages: referenceImagesPayload
                }
            });

        } else if (referenceImages && referenceImages.length === 1) {
             // Single image logic
             const { mimeType, data } = extractBase64AndMime(referenceImages[0]);

             operation = await ai.models.generateVideos({
                model: model,
                prompt: enhancedPrompt, 
                image: {
                    imageBytes: data,
                    mimeType: mimeType
                },
                config: videoConfig
             });
        } else {
            // Text only
            operation = await ai.models.generateVideos({
                model: model,
                prompt: enhancedPrompt,
                config: videoConfig
            });
        }

        // Important: Capture the operation name string immediately.
        const operationName = operation.name;
        if (!operationName) {
            console.error("Initial video operation missing name:", JSON.stringify(operation, null, 2));
            throw new Error("Failed to start video generation: No operation name returned.");
        }

        let currentOperation = operation;

        // Poll for completion
        while (!currentOperation.done) {
            await wait(10000); // Check every 10 seconds
            
            try {
                // Try SDK Polling first with correct object structure
                // We pass the full operation object as requested by docs
                // AND we ensure .name is present
                const opParam = { ...currentOperation };
                if (!opParam.name) opParam.name = operationName;
                
                // Use generic get if getVideosOperation is flakey
                if (ai.operations && (ai.operations as any).get) {
                     currentOperation = await (ai.operations as any).get({ name: operationName });
                } else {
                     currentOperation = await ai.operations.getVideosOperation({ 
                        operation: opParam as any
                    });
                }
                
            } catch (pollError: any) {
                console.warn("SDK polling failed, attempting REST fallback.", pollError);
                
                // Fallback to direct REST call
                try {
                    // Use the captured local apiKey variable which is guaranteed to be the string
                    const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
                    const response = await fetch(url);
                    if (!response.ok) {
                         const errText = await response.text();
                         console.error(`REST polling error body: ${errText}`);
                         throw new Error(`REST polling failed: ${response.status} at ${url}`);
                    }
                    currentOperation = await response.json();
                } catch (fetchError) {
                    console.error("Critical polling failure:", fetchError);
                    // Abort if both fail to prevent infinite loop
                    throw new Error("Unable to poll video status via SDK or REST.");
                }
            }
        }

        // Check for error in the operation
        if (currentOperation.error) {
            throw new Error(`Video generation failed: ${getErrorMessage(currentOperation.error)}`);
        }

        // Handle response extraction carefully
        const potentialResults = [
            currentOperation.result,
            currentOperation.response,
            currentOperation.result?.value,
            currentOperation.response?.value
        ];

        let downloadLink: string | undefined;

        for (const res of potentialResults) {
            if (res?.generatedVideos?.[0]?.video?.uri) {
                downloadLink = res.generatedVideos[0].video.uri;
                break;
            }
        }

        if (!downloadLink) {
            // Check for specific safety filter reasons
            for (const res of potentialResults) {
                if (res?.raiMediaFilteredReasons && Array.isArray(res.raiMediaFilteredReasons) && res.raiMediaFilteredReasons.length > 0) {
                     const reason = res.raiMediaFilteredReasons[0];
                     console.warn("Video filtered:", reason);
                     throw new Error(`Generation blocked: ${reason}`);
                }
            }

            console.error("Video operation completed but missing URI. Operation Dump:", JSON.stringify(currentOperation, null, 2));
            throw new Error("No video URI returned. The content may have been filtered due to safety policies.");
        }

        // Fetch MP4
        const videoResponse = await fetch(`${downloadLink}&key=${apiKey}`);
        if (!videoResponse.ok) throw new Error("Failed to download generated video");
        
        const blob = await videoResponse.blob();
        return URL.createObjectURL(blob);

    } catch (error: any) {
        console.error("Video generation failed:", error);
        const errorMessage = getErrorMessage(error);
        if (errorMessage.includes("caller does not have permission") || errorMessage.includes("API_KEY_INVALID")) {
             throw new Error("API_KEY_INVALID");
        }
        if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
             throw new Error("Video generation quota exceeded. Please check your plan or try again later.");
        }
        throw error;
    }
};


export const generateVariations = async (
  prompt: string,
  config: { aspectRatio: AspectRatio; imageSize: ImageSize; mode: 'image' | 'video'; duration?: number; fps?: number },
  referenceImages?: string[]
): Promise<{ url: string, type: 'image' | 'video' }[]> => {
    
    if (config.mode === 'video') {
        // For video, we generate 1 result because it's heavy/slow
        const videoUrl = await generateLiveWallpaper(
            prompt, 
            { 
                aspectRatio: config.aspectRatio,
                duration: config.duration || 5,
                fps: config.fps || 30
            }, 
            referenceImages
        );
        return [{ url: videoUrl, type: 'video' }];
    }

    // Static Image Mode
    // Pass all reference images if available
    const refs = referenceImages && referenceImages.length > 0 ? referenceImages : undefined;

    // Stagger requests significantly to avoid concurrency limits
    const promises = Array(4).fill(null).map(async (_, index) => {
        if (index > 0) {
            await wait(index * 8000);
        }
        return generateWallpaper(prompt, config, refs);
    });
    
    const results = await Promise.allSettled(promises);
    
    const apiKeyError = results.find(
        (r): r is PromiseRejectedResult => r.status === 'rejected' && r.reason?.message === 'API_KEY_INVALID'
    );
    
    if (apiKeyError) {
        throw apiKeyError.reason;
    }
    
    // Check if ALL failed with Quota/429
    const allQuotaErrors = results.every(
        r => r.status === 'rejected' && (
            (r.reason?.message || '').includes("quota exceeded") || 
            (r.reason?.message || '').includes("RESOURCE_EXHAUSTED")
        )
    );
    
    if (allQuotaErrors) {
        const firstError = (results[0] as PromiseRejectedResult).reason;
        throw firstError;
    }

    const images: { url: string, type: 'image' | 'video' }[] = [];
    results.forEach((result) => {
        if (result.status === 'fulfilled') {
            images.push({ url: result.value, type: 'image' });
        } else {
            console.error("One variation failed:", result.reason);
        }
    });

    if (images.length === 0) {
        const firstError = (results[0] as PromiseRejectedResult).reason;
        throw firstError;
    }

    return images;
}
