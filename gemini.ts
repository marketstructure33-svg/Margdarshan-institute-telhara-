import { GoogleGenAI } from '@google/genai';

const GEMINI_USER_KEY = "AQ.Ab8RN6Lvt7fBQbsJeUT6cCQNWxId9qN6cVwWKRean8T5wN-cIw";
const GEMINI_ADMIN_KEY = "AQ.Ab8RN6Llty_hJBo_rf9qmcB4Z0CJEigBqQkC_u0uLAMHMfOWQw";

export const aiUser = new GoogleGenAI({ apiKey: GEMINI_USER_KEY });
export const aiAdmin = new GoogleGenAI({ apiKey: GEMINI_ADMIN_KEY });

export const MODEL_NAME = 'gemini-3.1-pro-preview';
