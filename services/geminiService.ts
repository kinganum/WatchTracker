import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { WatchlistItem, ItemType, UpcomingRelease, SubType, MediaDetails } from "../types";

// --- Throttled Executor for Rate Limiting ---
const taskQueue: (() => Promise<any>)[] = [];
const resolverQueue: ((result: any) => void)[] = [];
const rejectorQueue: ((error: any) => void)[] = [];

let isLoopRunning = false;
const MIN_INTERVAL = 10100; // ~5-6 requests per minute, extremely safe.

async function queueLoop() {
    if (isLoopRunning) return;
    isLoopRunning = true;

    while (taskQueue.length > 0) {
        const startTime = Date.now();

        const task = taskQueue.shift()!;
        const resolve = resolverQueue.shift()!;
        const reject = rejectorQueue.shift()!;

        try {
            const result = await task();
            resolve(result);
        } catch (error) {
            reject(error);
        }

        const elapsedTime = Date.now() - startTime;
        const delay = MIN_INTERVAL - elapsedTime;

        if (delay > 0) {
            await new Promise(res => setTimeout(res, delay));
        }
    }

    isLoopRunning = false;
}

/**
 * Executes an async task through a throttled queue, ensuring a minimum interval
 * between the start of consecutive tasks to respect API rate limits.
 * @param asyncFn The async function to execute.
 * @returns A promise that resolves with the result of the async function.
 */
export function throttledExecutor<T>(asyncFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        taskQueue.push(asyncFn);
        resolverQueue.push(resolve);
        rejectorQueue.push(reject);
        queueLoop(); // This will start the loop if it's not already running
    });
}
// --- End of Throttled Executor ---


const ai = new GoogleGenAI({apiKey: process.env.API_KEY as string});

// --- Type Definitions for Structured Responses ---

export type ReleaseInfo = {
    name: string;
    status: string;
    releaseDate: string;
    expectedDate: string;
    platform: string;
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
 * Fetches structured information about the next installment of a given watchlist item.
 * Includes a retry mechanism with exponential backoff for rate limit errors.
 * @param item The watchlist item to check.
 * @returns A structured object with release details or an error string.
 */
export async function getUpcomingRelease(item: WatchlistItem): Promise<UpcomingRelease | string> {
    const model = 'gemini-2.5-flash';
    const currentYear = new Date().getFullYear();
    const searchYears = [currentYear, currentYear + 1, currentYear + 2];
    const MAX_RETRIES = 3;
    let lastError: any = null;

    let itemContext = '';
    if (item.sub_type === SubType.ANIME) {
        if (item.type === ItemType.MOVIES) {
            // Specific instructions for Anime Movies
            itemContext = `The user is following the Anime Movie "${item.title}". Their last known progress was watching the movie itself.
**CRITICAL ANIME MOVIE SEARCH STRATEGY:** Anime movie sequels often have completely different titles. A simple search for "${item.title} 2" might fail. You MUST perform a broader, franchise-aware search.
1.  **Identify the core franchise:** First, identify the main franchise for "${item.title}".
2.  **Search for related titles:** Search for any new movies (sequels, prequels, OVAs) related to this franchise that come after the user's progress.
3.  **Example:** If the movie is "Jujutsu Kaisen 0", you must find information about the main series or other related franchise entries. Your goal is to find the *true next installment* for the user, regardless of title changes.`;
        } else {
            // Instructions for Anime Series
            const progress = `Season ${item.season || 1}`;
            itemContext = `The user is following the Anime Series "${item.title}". Their last known progress was ${progress}.
**CRITICAL ANIME SERIES SEARCH STRATEGY:** Anime titles often change completely between seasons or sequels. A simple search for "${item.title} Season ${ (item.season || 1) + 1}" will likely fail. You MUST perform a broader, franchise-aware search.
1.  **Identify the core franchise:** First, identify the main franchise for "${item.title}".
2.  **Search for related titles:** Search for any new seasons, parts, cours, OVAs, or movies related to this franchise that come after the user's progress.
3.  **Example:** If the title is "Dr. Stone", you must find sequels like "Dr. Stone: New World" and then "Dr. Stone: Science Future". Do not stop at a direct title match. This is the most important part of your task.
Your goal is to find the *true next installment* for the user, regardless of title changes.`;
        }
    } else if (item.type === ItemType.MOVIES) {
        itemContext = `The user has watched the movie "${item.title}". Your task is to find the next installment in the **"${item.title}" franchise**. This could be a direct sequel (e.g., "Movie 2"), a prequel, or a spin-off with a different subtitle. Search broadly within the franchise.`;
    } else { // Generic TV Series
        itemContext = `The user is watching the TV series "${item.title}" and is on Season ${item.season || 1}. Your task is to find the next announced season for the **"${item.title}" franchise**. Be aware that spin-off series might exist.`;
    }

    const prompt = `You are a meticulous media release expert. Your task is to perform a deep and thorough search for the next installment of a user's watched item.

**Item Details:**
- Title: "${item.title}"
- Type: ${item.type}
- Sub-Type: ${item.sub_type || 'N/A'}
- User's Last Progress: ${item.season ? `Season ${item.season}` : 'N/A'}

**CRITICAL Instructions:**
1.  **Search Scope:** Find information for any installment that has been released or is scheduled for release between **${currentYear} and ${searchYears[searchYears.length - 1]}**. This includes items already released in the current year.
2.  **Deep Search Logic:** ${itemContext}
3.  **Verification:** Cross-reference information if possible. Prioritize official announcements. If information is only a rumor, you MUST set the status to "Rumored".
4.  **No Information:** If, after a thorough search, no confirmed or rumored release is found within the specified timeframe, you MUST use the status "No Update Found". Do not invent information.
5.  **Output Format:** Return your response as a single, clean JSON object. Do not include any text, markdown, or explanations outside of the JSON structure.

**JSON Schema:**
- "new_title": (string) The full official title of the new season or sequel.
- "next_installment": (string) The specific part, e.g., "Season 5", "Part II", "Cour 2".
- "release_date": (string) The release date. For released items, prioritize the exact date (YYYY-MM-DD). For unreleased items, be as specific as possible (e.g., "2025-10-31"), otherwise use broader terms (e.g., "Late 2024", "Q2 2025", "TBA").
- "platform": (string) The primary streaming platform in India (e.g., "Netflix", "Amazon Prime Video", "Crunchyroll").
- "status": (string) Must be one of: "Confirmed", "Rumored", or "No Update Found".`;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response: GenerateContentResponse = await throttledExecutor(() => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            new_title: { type: Type.STRING },
                            next_installment: { type: Type.STRING },
                            release_date: { type: Type.STRING },
                            platform: { type: Type.STRING },
                            status: { type: Type.STRING },
                        },
                        required: ["new_title", "next_installment", "release_date", "platform", "status"],
                    },
                },
            }));

            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            return parsed as UpcomingRelease; // Success, exit function

        } catch (error: any) {
            lastError = error;
            const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error);
            console.error(`Attempt ${i + 1} for "${item.title}" failed:`, errorMessage);
            
            const isRetriableError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('500');

            if (isRetriableError) {
                if (i < MAX_RETRIES - 1) { // Don't wait on the last attempt
                    const delay = (2 ** i) * 2000 + Math.random() * 500;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue; // Retry
                }
            } else {
                // It's not a retriable error, so don't try again
                break;
            }
        }
    }

    const finalErrorMessage = typeof lastError?.message === 'string' ? lastError.message : JSON.stringify(lastError);
    console.error(`Error calling Gemini API for "${item.title}" after all retries:`, finalErrorMessage);
    
    if (finalErrorMessage) {
        if (finalErrorMessage.includes('429') || finalErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            return "Rate limit exceeded. Please try again in a few moments.";
        }
        if (finalErrorMessage.includes('500')) {
            return "A server error occurred while fetching updates. Please try again later.";
        }
    }

    if (lastError instanceof Error && finalErrorMessage.includes('API key not valid')) {
         return "Error: The API key is not valid. Please check your configuration.";
    }
    return "Sorry, I couldn't fetch any information at the moment. Please try again later.";
}

/**
 * Queries Gemini for a conversational response to a follow-up question in the AI chat.
 * @param query The user's query.
 * @param history The recent chat history for context.
 * @returns A string with the AI's response.
 */
export async function getConversationalResponse(query: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
    const model = 'gemini-2.5-flash';
    const prompt = `You are a helpful and friendly media expert. Based on the conversation history, provide a direct and concise answer to the user's latest query. Do not return structured data or JSON. Just provide a natural language response.

**Conversation History:**
${history.map(h => `${h.role === 'user' ? 'User' : 'You'}: ${h.parts[0].text}`).join('\n')}

**User's Query:** "${query}"

**Your Response:**`;

    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response: GenerateContentResponse = await throttledExecutor(() => ai.models.generateContent({
                model,
                contents: prompt,
            }));
            return response.text;
        } catch (error: any) {
            lastError = error;
            const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error);
            console.error(`Attempt ${i + 1} for conversational response failed:`, errorMessage);

            const isRetriableError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('500');
            if (isRetriableError && i < MAX_RETRIES - 1) {
                const delay = (2 ** i) * 1000 + Math.random() * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                break;
            }
        }
    }

    const finalErrorMessage = typeof lastError?.message === 'string' ? lastError.message : JSON.stringify(lastError);
    console.error("Error calling Gemini for conversational response after all retries:", finalErrorMessage);

    if (finalErrorMessage && (finalErrorMessage.includes('429') || finalErrorMessage.includes('RESOURCE_EXHAUSTED'))) {
        return "Rate limit exceeded. Please try again in a few moments.";
    }
    if (finalErrorMessage && finalErrorMessage.includes('500')) {
        return "A server error occurred while fetching data. Please try again later.";
    }
    if (lastError instanceof Error && finalErrorMessage.includes('API key not valid')) {
        return "Error: The API key is not valid. Please check your configuration.";
    }
    return "Sorry, I encountered an error. Please try again.";
}


/**
 * Queries Gemini for detailed information about a specific media title for the AI chat.
 * @param query The user's query about a movie, series, or anime.
 * @param history The recent chat history for context.
 * @returns A structured object with media details or an error string.
 */
export async function getMediaDetailsFromAi(query: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<MediaDetails | string> {
    const model = 'gemini-2.5-flash';
    const validSubTypes = Object.values(SubType).join(', ');

    const prompt = `You are a sophisticated media information assistant. Your task is to analyze the user's query and provide structured information about the requested movie, TV series, or anime.

**Context from recent conversation:**
${history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}

**Current User Query:** "${query}"

**CRITICAL Instructions:**
1.  **Identify the Media:** Determine the specific media item the user is asking about.
2.  **Case-Insensitive Search:** You MUST treat the user's query as case-insensitive. For example, a search for "war" should yield the same results as "War".
3.  **Determine Type & Sub-Type:**
    - 'type': The general media format. It MUST be one of: 'Movie', 'TV Series', 'Anime Series', 'Anime Movie'. Do NOT use just 'Anime'. If it is an anime series, use 'Anime Series'. If it's a non-animated series, use 'TV Series'.
    - 'sub_type': The industry of origin. It MUST be one of: ${validSubTypes}. If the item is an anime, the sub_type MUST be 'Anime'. If unsure, use 'Unknown'.
4.  **Fill the Schema:** Populate the JSON object. For fields that don't apply (e.g., 'episodes' for a movie), you MUST use "N/A".
5.  **Sequel/Franchise Info:** For 'season_sequel', be concise. E.g., "5 Seasons", "3rd film in a 5-movie series". Do NOT include long descriptions of other shows here.
6.  **Continuity Field:** CRITICAL: If you find a direct sequel or spin-off series with a DIFFERENT TITLE that continues the story, you MUST put its full official title in the 'continuity' field. Otherwise, this field MUST be "N/A".
7.  **Release/End Dates:** Provide the initial 'release_date'. For 'end_date', you MUST use 'Ongoing' if the series has not concluded. Use 'N/A' for single movies.
8.  **Upcoming Date:** CRITICAL: If and ONLY IF 'end_date' is 'Ongoing', find the release date for the next season/part. Include if it's official or unconfirmed. If no date is known, use "N/A". Otherwise, this field MUST be "N/A".
9.  **Strict Output:** Your entire response MUST be a single, clean JSON object. Do not include any text, markdown, or explanations outside of the JSON structure.

**JSON Schema:**
- "name": (string) The full official title.
- "type": (string) Must be one of: 'Movie', 'TV Series', 'Anime Series', 'Anime Movie', 'Unknown'.
- "sub_type": (string) Must be one of: ${validSubTypes}, Unknown.
- "season_sequel": (string) Concise info on seasons or franchise place.
- "count": (number) The total number of seasons for a series, or parts for a movie franchise. Use 1 for standalone movies.
- "episodes": (string) Total episodes. "N/A" for movies.
- "part": (string) The part number or name if applicable. "N/A" otherwise.
- "genre": (string) A comma-separated list of primary genres.
- "cast": (array of strings) Key actors or characters (limit 4-5).
- "release_date": (string) The initial release date.
- "end_date": (string) End date or 'Ongoing'. 'N/A' for movies.
- "upcoming_date": (string) Release date of next part if 'end_date' is 'Ongoing'. "N/A" otherwise.
- "language": (string) Primary language and dub availability.
- "platform": (string) Primary streaming platform or release type.
- "continuity": (string) Name of the sequel/spin-off series, or "N/A".`;
    
    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response: GenerateContentResponse = await throttledExecutor(() => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            type: { type: Type.STRING },
                            sub_type: { type: Type.STRING },
                            season_sequel: { type: Type.STRING },
                            count: { type: Type.NUMBER },
                            episodes: { type: Type.STRING },
                            part: { type: Type.STRING },
                            genre: { type: Type.STRING },
                            cast: { type: Type.ARRAY, items: { type: Type.STRING } },
                            release_date: { type: Type.STRING },
                            end_date: { type: Type.STRING },
                            upcoming_date: { type: Type.STRING },
                            language: { type: Type.STRING },
                            platform: { type: Type.STRING },
                            continuity: { type: Type.STRING },
                        },
                        required: ["name", "type", "sub_type", "season_sequel", "count", "episodes", "part", "genre", "cast", "release_date", "end_date", "upcoming_date", "language", "platform", "continuity"],
                    },
                },
            }));

            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            return parsed as MediaDetails;

        } catch (error: any) {
            lastError = error;
            const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error);
            console.error(`Attempt ${i + 1} for media details failed:`, errorMessage);

            const isRetriableError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('500');
            if (isRetriableError && i < MAX_RETRIES - 1) {
                const delay = (2 ** i) * 1000 + Math.random() * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                break;
            }
        }
    }
    
    const finalErrorMessage = typeof lastError?.message === 'string' ? lastError.message : JSON.stringify(lastError);
    console.error("Error calling Gemini for media details after all retries:", finalErrorMessage);

    if (finalErrorMessage) {
        if (finalErrorMessage.includes('429') || finalErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            return "Rate limit exceeded. Please try again in a few moments.";
        }
        if (finalErrorMessage.includes('500')) {
            return "A server error occurred while fetching data. Please try again later.";
        }
    }
    if (lastError instanceof Error && finalErrorMessage.includes('API key not valid')) {
        return "Error: The API key is not valid. Please check your configuration.";
    }
    return "Sorry, I couldn't find any information for that query. Please try rephrasing it.";
}

/**
 * Queries Gemini for structured recommendations based on a given media title.
 * @param query The user's query, e.g., "Suggest similar shows to Spy x Family".
 * @returns An array of structured MediaDetails objects or an error string.
 */
export async function getSuggestionsFromAi(query: string): Promise<MediaDetails[] | string> {
    const model = 'gemini-2.5-flash';
    const validSubTypes = Object.values(SubType).join(', ');

    const prompt = `You are a sophisticated media recommendation engine. Your task is to analyze the user's query and provide a list of 3-4 structured recommendations for similar shows.

**User Query:** "${query}"

**CRITICAL Instructions:**
1.  **Identify the Core Title:** Extract the main title the user wants recommendations for.
2.  **Generate Recommendations:** Find 3-4 highly relevant movies or series.
3.  **Return Structured Data:** For EACH recommendation, you MUST provide a complete JSON object matching the schema below.
4.  **Fill All Fields:** Populate every field in the schema for each recommendation. Use "N/A" where information is not applicable.
5.  **Strict Output:** Your entire response MUST be a single, clean JSON array of objects. Do not include any text, markdown, or explanations outside of the JSON structure.

**JSON Schema for EACH item in the array:**
- "name": (string) The full official title.
- "type": (string) Must be one of: 'Movie', 'TV Series', 'Anime Series', 'Anime Movie', 'Unknown'.
- "sub_type": (string) Must be one of: ${validSubTypes}, Unknown.
- "season_sequel": (string) Concise info on seasons or franchise place.
- "count": (number) The total number of seasons for a series, or parts for a movie franchise. Use 1 for standalone movies.
- "episodes": (string) Total episodes. "N/A" for movies.
- "part": (string) The part number or name if applicable. "N/A" otherwise.
- "genre": (string) A comma-separated list of primary genres.
- "cast": (array of strings) Key actors or characters (limit 4-5).
- "release_date": (string) The initial release date.
- "end_date": (string) End date or 'Ongoing'. 'N/A' for movies.
- "upcoming_date": (string) Release date of next part if 'end_date' is 'Ongoing'. "N/A" otherwise.
- "language": (string) Primary language and dub availability.
- "platform": (string) Primary streaming platform or release type.
- "continuity": (string) Name of the sequel/spin-off series, or "N/A".`;
    
    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response: GenerateContentResponse = await throttledExecutor(() => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                type: { type: Type.STRING },
                                sub_type: { type: Type.STRING },
                                season_sequel: { type: Type.STRING },
                                count: { type: Type.NUMBER },
                                episodes: { type: Type.STRING },
                                part: { type: Type.STRING },
                                genre: { type: Type.STRING },
                                cast: { type: Type.ARRAY, items: { type: Type.STRING } },
                                release_date: { type: Type.STRING },
                                end_date: { type: Type.STRING },
                                upcoming_date: { type: Type.STRING },
                                language: { type: Type.STRING },
                                platform: { type: Type.STRING },
                                continuity: { type: Type.STRING },
                            },
                            required: ["name", "type", "sub_type", "season_sequel", "count", "episodes", "part", "genre", "cast", "release_date", "end_date", "upcoming_date", "language", "platform", "continuity"],
                        }
                    },
                },
            }));

            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            return parsed as MediaDetails[];

        } catch (error: any) {
            lastError = error;
            const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error);
            console.error(`Attempt ${i + 1} for suggestions failed:`, errorMessage);

            const isRetriableError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('500');
            if (isRetriableError && i < MAX_RETRIES - 1) {
                const delay = (2 ** i) * 1000 + Math.random() * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                break;
            }
        }
    }

    const finalErrorMessage = typeof lastError?.message === 'string' ? lastError.message : JSON.stringify(lastError);
    console.error("Error calling Gemini for suggestions after all retries:", finalErrorMessage);
    
    if (finalErrorMessage) {
        if (finalErrorMessage.includes('429') || finalErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            return "Rate limit exceeded. Please try again in a few moments.";
        }
        if (finalErrorMessage.includes('500')) {
            return "A server error occurred while fetching data. Please try again later.";
        }
    }
    if (lastError instanceof Error && finalErrorMessage.includes('API key not valid')) {
        return "Error: The API key is not valid. Please check your configuration.";
    }
    return "Sorry, I couldn't find any suggestions for that query. Please try rephrasing it.";
}

/**
 * Queries Gemini for notable movies and series for a specific person.
 * @param personName The name of the actor or person.
 * @returns An array of structured MediaDetails objects or an error string.
 */
export async function getMediaByPersonFromAi(personName: string): Promise<MediaDetails[] | string> {
    const model = 'gemini-2.5-flash';
    const validSubTypes = Object.values(SubType).join(', ');

    const prompt = `You are a sophisticated media recommendation engine. Your task is to provide a list of 3-4 of the most notable movies or series for the person named "${personName}".

**User Query:** "Find media starring ${personName}"

**CRITICAL Instructions:**
1.  **Generate Recommendations:** Find 3-4 highly relevant movies or series.
2.  **Return Structured Data:** For EACH recommendation, you MUST provide a complete JSON object matching the schema below.
3.  **Fill All Fields:** Populate every field in the schema for each recommendation. Use "N/A" where information is not applicable.
4.  **Strict Output:** Your entire response MUST be a single, clean JSON array of objects. Do not include any text, markdown, or explanations outside of the JSON structure.

**JSON Schema for EACH item in the array:**
- "name": (string) The full official title.
- "type": (string) Must be one of: 'Movie', 'TV Series', 'Anime Series', 'Anime Movie', 'Unknown'.
- "sub_type": (string) Must be one of: ${validSubTypes}, Unknown.
- "season_sequel": (string) Concise info on seasons or franchise place.
- "count": (number) The total number of seasons for a series, or parts for a movie franchise. Use 1 for standalone movies.
- "episodes": (string) Total episodes. "N/A" for movies.
- "part": (string) The part number or name if applicable. "N/A" otherwise.
- "genre": (string) A comma-separated list of primary genres.
- "cast": (array of strings) Key actors or characters (limit 4-5).
- "release_date": (string) The initial release date.
- "end_date": (string) End date or 'Ongoing'. 'N/A' for movies.
- "upcoming_date": (string) Release date of next part if 'end_date' is 'Ongoing'. "N/A" otherwise.
- "language": (string) Primary language and dub availability.
- "platform": (string) Primary streaming platform or release type.
- "continuity": (string) Name of the sequel/spin-off series, or "N/A".`;
    
    const MAX_RETRIES = 3;
    let lastError: any = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response: GenerateContentResponse = await throttledExecutor(() => ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                type: { type: Type.STRING },
                                sub_type: { type: Type.STRING },
                                season_sequel: { type: Type.STRING },
                                count: { type: Type.NUMBER },
                                episodes: { type: Type.STRING },
                                part: { type: Type.STRING },
                                genre: { type: Type.STRING },
                                cast: { type: Type.ARRAY, items: { type: Type.STRING } },
                                release_date: { type: Type.STRING },
                                end_date: { type: Type.STRING },
                                upcoming_date: { type: Type.STRING },
                                language: { type: Type.STRING },
                                platform: { type: Type.STRING },
                                continuity: { type: Type.STRING },
                            },
                            required: ["name", "type", "sub_type", "season_sequel", "count", "episodes", "part", "genre", "cast", "release_date", "end_date", "upcoming_date", "language", "platform", "continuity"],
                        }
                    },
                },
            }));

            const jsonText = response.text.trim();
            const parsed = JSON.parse(jsonText);
            return parsed as MediaDetails[];

        } catch (error: any) {
            lastError = error;
            const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error);
            console.error(`Attempt ${i + 1} for person's media failed:`, errorMessage);

            const isRetriableError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('500');
            if (isRetriableError && i < MAX_RETRIES - 1) {
                const delay = (2 ** i) * 1000 + Math.random() * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                break;
            }
        }
    }

    const finalErrorMessage = typeof lastError?.message === 'string' ? lastError.message : JSON.stringify(lastError);
    console.error("Error calling Gemini for person's media after all retries:", finalErrorMessage);
    
    if (finalErrorMessage) {
        if (finalErrorMessage.includes('429') || finalErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            return "Rate limit exceeded. Please try again in a few moments.";
        }
        if (finalErrorMessage.includes('500')) {
            return "A server error occurred while fetching data. Please try again later.";
        }
    }
    if (lastError instanceof Error && finalErrorMessage.includes('API key not valid')) {
        return "Error: The API key is not valid. Please check your configuration.";
    }
    return `Sorry, I couldn't find any information for "${personName}". Please try rephrasing it.`;
}


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
): Promise<ReleaseInfo | Recommendation[] | string> {
    const model = 'gemini-2.5-flash';
    const MAX_RETRIES = 3;
    let lastError: any = null;

    let prompt: string;
    if (mode === 'release') {
        let itemContext = '';
        if (item.sub_type === SubType.ANIME) {
            itemContext = `The user is following the Anime "${item.title}".
**CRITICAL ANIME SEARCH STRATEGY:** Anime titles often change completely between installments. You MUST perform a broader, franchise-aware search.
1.  **Identify the core franchise:** First, identify the main franchise for "${item.title}".
2.  **Search for related titles:** Search for any new seasons, movies, or OVAs related to this franchise. Your goal is to find the *true next installment*, regardless of title changes.`;
        } else if (item.type === ItemType.MOVIES) {
            itemContext = `The user has watched the movie "${item.title}". The primary goal is to find information about the *next sequential installment* (e.g., a sequel like "Movie Title 2").`;
        } else { // Generic TV Series
            itemContext = `The user is watching the TV series "${item.title}" and their last logged progress is Season ${item.season || 'N/A'}. The goal is to find information about the *next episode or season*.`;
        }
        
        prompt = `You are a media release expert. Based on today's date, provide the release status for the next part of "${item.title}".
${itemContext}

Return your response as a single, clean JSON object. Do not include any text, markdown, or explanations outside of the JSON structure.

JSON Schema:
- "name": (string) The full official title of the new season or sequel. Use the original title if no sequel is found.
- "status": (string) Must be one of: "Released", "Unreleased", or "No Sequel Planned".
- "releaseDate": (string) The exact release date (YYYY-MM-DD) if the status is "Released". Otherwise, use "N/A".
- "expectedDate": (string) The expected release window (e.g., "Late 2024", "Q2 2025", "TBA") if the status is "Unreleased". Otherwise, use "N/A".
- "platform": (string) The primary streaming platform in India (e.g., "Netflix", "Amazon Prime Video"). Use "N/A" if unknown.`;
    } else { // 'recommendations'
        prompt = `You are a media recommendation expert. The user likes "${item.title}". Provide a list of 3 highly relevant recommendations.

**CRITICAL Instructions:**
1.  **Relevance:** Recommendations must be in the same language and sub-type (e.g., if the original is Bollywood, recommend other Bollywood titles).
2.  **Format:** Return a clean JSON array of objects, with no surrounding text or markdown.
3.  **Anime Specifics:** If the sub-type is 'Anime', the 'cast' field should list major characters, not voice actors.
4.  **Content:** Include title, a brief description, genre, cast, and streaming platform.

**JSON Schema for each object in the array:**
- "title": (string) The recommended title.
- "description": (string) A short, one-sentence description.
- "genre": (string) The primary genre.
- "sub_type": (string) The sub-type, which must match the original item's sub-type.
- "cast": (array of strings) A short list of 2-3 key cast members or characters.
- "platform": (string) The main streaming platform in India.
- "dub": (string) "Available" or "Not Available".
- "item_type": (string) "TV Series" or "Movie".
- "count": (number) The number of seasons (for TV series) or parts (for movies).`;
    }

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            if (mode === 'release') {
                const response: GenerateContentResponse = await throttledExecutor(() => ai.models.generateContent({ 
                    model, 
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                status: { type: Type.STRING },
                                releaseDate: { type: Type.STRING },
                                expectedDate: { type: Type.STRING },
                                platform: { type: Type.STRING },
                            },
                            required: ["name", "status", "releaseDate", "expectedDate", "platform"],
                        },
                    },
                }));
                const jsonText = response.text.trim();
                const parsed = JSON.parse(jsonText);
                return parsed as ReleaseInfo;
            } else { // 'recommendations'
                const response: GenerateContentResponse = await throttledExecutor(() => ai.models.generateContent({
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
                                    cast: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    platform: { type: Type.STRING },
                                    dub: { type: Type.STRING },
                                    item_type: { type: Type.STRING },
                                    count: { type: Type.NUMBER },
                                },
                                required: ["title", "description", "genre", "sub_type", "cast", "platform", "dub", "item_type", "count"],
                            },
                        },
                    },
                }));
                const jsonText = response.text.trim();
                const parsed = JSON.parse(jsonText);
                return parsed as Recommendation[];
            }
        } catch (error: any) {
            lastError = error;
            const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error);
            console.error(`Attempt ${i + 1} for Gemini insights on "${item.title}" (${mode}) failed:`, errorMessage);

            const isRetriableError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('500');

            if (isRetriableError && i < MAX_RETRIES - 1) {
                const delay = (2 ** i) * 1000 + Math.random() * 500;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; // Retry
            } else {
                break; // Not a retriable error or max retries reached
            }
        }
    }

    const finalErrorMessage = typeof lastError?.message === 'string' ? lastError.message : JSON.stringify(lastError);
    console.error(`Error calling Gemini API for "${item.title}" insights after all retries:`, finalErrorMessage);
    
    if (finalErrorMessage) {
        if (finalErrorMessage.includes('429') || finalErrorMessage.includes('RESOURCE_EXHAUSTED')) {
            return "Rate limit exceeded. Please try again in a few moments.";
        }
         if (finalErrorMessage.includes('500')) {
            return "A server error occurred while fetching data. Please try again later.";
        }
    }
    if (lastError instanceof Error && finalErrorMessage.includes('API key not valid')) {
         return "Error: The API key is not valid. Please check your configuration.";
    }
    return "Sorry, I couldn't fetch any information at the moment. Please try again later.";
}