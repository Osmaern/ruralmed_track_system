import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, GeminiInsight } from '../types';

const getAiClient = () => {
  // Use Vite's native environment variable access (import.meta.env)
  // Fallback to process.env for other build environments if necessary
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
        summary: "API configuration missing. Unable to contact Smart Assistant.",
        urgentActions: [],
        restockSuggestions: []
      };
    }

    // Filter data to reduce token usage and focus on critical aspects
    const inventorySummary = items.map(i => ({
      name: i.name,
      qty: i.quantity,
      min: i.minLevel,
      cat: i.category,
      exp: i.expiryDate.split('T')[0]
    }));

    const prompt = `
      You are a medical inventory assistant for a rural clinic. 
      Analyze this JSON inventory list: ${JSON.stringify(inventorySummary)}.
      
      Provide a structured JSON response with:
      1. A short textual summary (max 2 sentences) of the overall stock health. Be professional and concise.
      2. A list of "urgentActions" (e.g., items expired, items below 50% of min level).
      3. A list of "restockSuggestions" (items nearing min level or logically related items that might be missing).
      
      Prioritize Critical category items.
      Return PURE JSON only.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          temperature: 0.2, // Low temperature for deterministic, factual responses
          topK: 1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              urgentActions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              restockSuggestions: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            }
          }
        }
      });

      let text = response.text;
      
      if (!text) {
        throw new Error("Received empty response from AI service.");
      }

      // Robust Sanitization: Remove markdown code blocks (```json ... ```) and whitespace
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      return JSON.parse(text) as GeminiInsight;
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return {
        summary: "Temporary connection issue with the Smart Assistant. Please try again.",
        urgentActions: ["Check internet connection"],
        restockSuggestions: []
      };
    }
  }
};