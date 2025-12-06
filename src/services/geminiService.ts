import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, GeminiInsight } from '../types';

const getAiClient = () => {
  // Try Vite env var first, then fallback to standard process.env (for other setups)
  const apiKey = import.meta.env?.VITE_API_KEY || (process as any).env?.API_KEY;
  
  if (!apiKey) {
    console.warn("Gemini API Key is missing. Please set VITE_API_KEY in your .env file.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const GeminiService = {
  analyzeInventory: async (items: InventoryItem[]): Promise<GeminiInsight> => {
    const ai = getAiClient();
    if (!ai) {
      return {
        summary: "API Key missing. Please check your .env file.",
        urgentActions: ["Configure VITE_API_KEY"],
        restockSuggestions: []
      };
    }

    const summaryData = items.map(i => ({ 
      n: i.name, 
      q: i.quantity, 
      m: i.minLevel, 
      c: i.category, 
      e: i.expiryDate.split('T')[0] 
    }));

    const prompt = `
      You are a medical inventory assistant. Analyze: ${JSON.stringify(summaryData)}.
      Return strictly JSON with:
      { "summary": "string", "urgentActions": ["string"], "restockSuggestions": ["string"] }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              urgentActions: { type: Type.ARRAY, items: { type: Type.STRING } },
              restockSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      });
      
      const text = response.text?.replace(/```json/g, "").replace(/```/g, "").trim();
      return text ? JSON.parse(text) : { summary: "No Response", urgentActions: [], restockSuggestions: [] };
    } catch (e) {
      console.error(e);
      return { 
        summary: "Connection failed. Check internet.", 
        urgentActions: [], 
        restockSuggestions: [] 
      };
    }
  }
};