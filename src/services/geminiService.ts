import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, GeminiInsight } from '../types';

const getAiClient = () => {
  const apiKey = import.meta.env?.VITE_API_KEY;
  
  if (!apiKey) {
    console.warn("Gemini API Key is missing. Please set VITE_API_KEY in your .env file or Netlify Dashboard.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const GeminiService = {
  analyzeInventory: async (items: InventoryItem[]): Promise<GeminiInsight> => {
    const ai = getAiClient();
    if (!ai) {
      return {
        summary: "Smart Assistant is offline. (Missing API Key)",
        urgentActions: [],
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