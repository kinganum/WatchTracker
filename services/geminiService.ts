import { GoogleGenAI, Type } from "@google/genai";
import { WatchlistItem, ItemType } from "../types";

const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});

// --- Type Definitions for Structured Responses ---

export type ReleaseInfoResponse = {
    text: string;
    sources: any[] | undefined;
};

export type Recommendation = {
    title: string;
    description: string;
    genre: string;
    sub_type: string;
    cast: string[];
    platform: string;
    dub: string;
    item_type: 'TV Series' | 'Movie';
    count: number;
};


/**
 * Fetches structured insights about a watchlist item from the Gemini API.
 * Can operate in two modes: 'release' or 'recommendations'.
 * @param item The watchlist item to get insights for.
 * @param mode The type of insight to fetch.
 * @returns A structured response object or an error string.
 */
export async function getGeminiInsights(
    item: WatchlistItem,
    mode: 'release' | 'recommendations'
): Promise<ReleaseInfoResponse | Recommendation[] | string> {
    const model = 'gemini-2.5-flash';

    try {
        if (mode === 'release') {
            const itemContext = item.type === ItemType.MOVIES 
                ? `The user has watched "${item.title}". The primary goal is to find information about the *next sequential installment* (e.g., a sequel like "Movie Title 2").`
                : `The user is watching "${item.title}" and their last logged progress is Season ${item.season || 'N/A'}, Episode ${item.episode || 'N/A'}. The goal is to find information about the *next episode or season*.`;
            
            const prompt = `You are a media release expert. Based on today's date, provide the release status for the next part of "${item.title}".
${itemContext}

Strictly format your response using the following key-value structure. Do not add any conversational text, markdown formatting, or explanations.
Name: [Name of the sequel/next part]
Status: [Released / Unreleased / No Sequel Planned]
Release Date: [Date if released, otherwise N/A]
Expected Date: [Date if unreleased, otherwise N/A]
Platform: [Streaming platform in India, otherwise N/A]`;
            
            const response = await ai.models.generateContent({ 
                model, 
                contents: prompt,
                config: {
                    tools: [{googleSearch: {}}],
                },
            });

            return {
                text: response.text,
                sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
            };

        } else { // recommendations mode
            const prompt = `You are a movie and TV show recommendation expert with a focus on the Indian streaming market. Based on the following item, recommend 10 similar titles.

**Title:** "${item.title}"
**Sub-Type:** ${item.sub_type || 'N/A'}

Return your response as a JSON array of objects. Each object must strictly adhere to the following key definitions:
- "title": The title of the recommended item.
- "description": A short, one-sentence summary.
- "genre": The primary genre (e.g., "Action / Thriller").
- "sub_type": The specific sub-type (e.g., 'Bollywood', 'Anime', 'Hollywood').
- "cast": An array of strings.
  - If the "sub_type" is 'Anime', this must be an array of the top 2-3 main CHARACTER names (e.g., ["Goku", "Vegeta"]).
  - For all other sub_types, this must be an array of the top 2-3 main ACTOR names (e.g., ["Yash", "Srinidhi Shetty"]).
- "platform": The primary streaming platform in India (e.g., "Amazon Prime Video", "Netflix", "Hotstar"). Must not be "N/A" if a platform is known.
- "dub": A string indicating English and/or Hindi dub availability. Use "English, Hindi", "English", "Hindi", or "N/A".
- "item_type": A string, either "TV Series" or "Movie".
- "count": A number.
  - If "item_type" is "TV Series", this is the total number of seasons.
  - If "item_type" is "Movie", this is the total number of parts/sequels in the franchise (1 for a standalone movie).`;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                genre: { type: Type.STRING },
                                sub_type: { type: Type.STRING },
                                cast: { 
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING }
                                },
                                platform: { type: Type.STRING },
                                dub: { type: Type.STRING },
                                item_type: { type: Type.STRING },
                                count: { type: Type.NUMBER },
                            },
                            required: ["title", "description", "genre", "sub_type", "cast", "platform", "dub", "item_type", "count"],
                        },
                    },
                },
            });
            
            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            return parsed as Recommendation[];
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
             return "Error: The API key is not valid. Please check your configuration.";
        }
        return "Sorry, I couldn't fetch any information at the moment. Please try again later.";
    }
}