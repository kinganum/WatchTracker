import { NewWatchlistItem, ItemType, SubType, Status, Language, ReleaseType, WatchlistItem } from '../types';
import { SUB_TYPE_OPTIONS } from '../constants';

const formatTitle = (title: string): string => {
    if (!title) return '';
    const trimmed = title.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const patterns = {
    season: /\b(?:s|season)\s?(\d+)\b/i,
    episode: /\b(?:e|ep|episode)\s?\.?(\d+)\b/i,
    part: /\b(?:p|part)\s?(\d+)\b/i,
    type: new RegExp(`\\b(${['series', 'tv series', 'tv', 'movie', 'movies', 'film'].join('|')})\\b`, 'i'),
    subType: new RegExp(`\\b(${Object.values(SubType).join('|')})\\b`, 'i'),
    status: new RegExp(`\\b(${['continue', 'continuing', 'continue old', 'contiune', 'watch', 'stopped', 'stop', 'complete', 'completed'].join('|')})\\b`, 'i'),
    language: new RegExp(`\\b(${['eng', 'english', 'dub', 'sub', 'japanese', 'jpn'].join('|')})\\b`, 'i'),
    releaseType: new RegExp(`\\b(${['new', 'old'].join('|')})\\b`, 'i'),
};

const normalize = {
    type: (value: string): ItemType => {
        const lower = value.toLowerCase();
        if (['series', 'tv series', 'tv'].includes(lower)) return ItemType.TV_SERIES;
        if (['movie', 'movies', 'film'].includes(lower)) return ItemType.MOVIES;
        return ItemType.TV_SERIES;
    },
    subType: (value: string): SubType | undefined => {
        const capitalized = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        return (SUB_TYPE_OPTIONS as string[]).includes(capitalized) ? capitalized as SubType : undefined;
    },
    status: (value: string): Status => {
        const lower = value.toLowerCase();
        if (['continue', 'continuing', 'continue old', 'contiune'].includes(lower)) return Status.WAITING;
        if (['stopped', 'stop'].includes(lower)) return Status.STOPPED;
        if (['complete', 'completed'].includes(lower)) return Status.COMPLETED;
        return Status.WATCH;
    },
    language: (value: string): Language | undefined => {
        const lower = value.toLowerCase();
        if (['eng', 'english', 'dub'].includes(lower)) return Language.DUB;
        if (['sub', 'japanese', 'jpn'].includes(lower)) return Language.SUB;
        return undefined;
    },
    releaseType: (value: string): ReleaseType => {
        return value.toLowerCase() === 'old' ? ReleaseType.OLD : ReleaseType.NEW;
    },
};

const isHeaderLine = (line: string): boolean => {
    const lowerLine = line.toLowerCase();
    const hasSubType = patterns.subType.test(lowerLine);
    if (!hasSubType) return false;

    // A header should not contain item-specific markers like s1, e1, movie, series
    const hasItemMarkers = patterns.season.test(lowerLine) ||
                           patterns.episode.test(lowerLine) ||
                           patterns.part.test(lowerLine) ||
                           patterns.type.test(lowerLine);
    
    // Heuristic: if it has a sub_type and no other specific item markers, it's a header.
    return hasSubType && !hasItemMarkers;
};

const parseHeader = (line: string): Partial<NewWatchlistItem> => {
    const defaults: Partial<NewWatchlistItem> = {};
    const subTypeMatch = line.match(patterns.subType);
    if (subTypeMatch) {
        const subType = normalize.subType(subTypeMatch[1] || subTypeMatch[0]);
        if (subType) defaults.sub_type = subType;
    }

    const statusMatch = line.match(patterns.status);
    if (statusMatch) defaults.status = normalize.status(statusMatch[1] || statusMatch[0]);
    
    const releaseMatch = line.match(patterns.releaseType);
    if (releaseMatch) defaults.release_type = normalize.releaseType(releaseMatch[1] || releaseMatch[0]);
    
    return defaults;
};

const parseLine = (line: string, defaults: Partial<NewWatchlistItem>): { item: NewWatchlistItem | null, rawLine: string } => {
    let currentLine = ` ${line} `;

    const extracted: Partial<NewWatchlistItem> = {};

    const extract = (field: keyof typeof patterns, normalizer: (val: string) => any) => {
        const match = currentLine.match(patterns[field]);
        if (match) {
            const value = match[1] || match[0];
            (extracted as any)[field] = normalizer(value);
            currentLine = currentLine.replace(match[0], '');
        }
    };
    
    const extractNumber = (field: 'season' | 'episode' | 'part') => {
         const match = currentLine.match(patterns[field]);
        if (match && match[1]) {
            extracted[field] = parseInt(match[1], 10);
            currentLine = currentLine.replace(match[0], '');
        }
    }

    extractNumber('season');
    extractNumber('episode');
    extractNumber('part');
    extract('type', normalize.type);
    extract('subType', normalize.subType);
    extract('status', normalize.status);
    extract('language', normalize.language);
    extract('releaseType', normalize.releaseType);
    
    const title = formatTitle(currentLine.replace(/[|,-/]/g, ' ').replace(/\s+/g, ' ').trim());

    if (!title) {
        return { item: null, rawLine: line };
    }

    const finalItem: NewWatchlistItem = {
        title,
        type: extracted.type || defaults.type || ItemType.TV_SERIES,
        status: extracted.status || defaults.status || Status.WATCH,
        sub_type: extracted.sub_type || defaults.sub_type,
        season: extracted.season,
        episode: extracted.episode,
        part: extracted.part,
        language: extracted.language || defaults.language,
        release_type: extracted.release_type || defaults.release_type || ReleaseType.NEW,
    };
    
    return { item: finalItem, rawLine: '' };
};

export const parseSmartPasteText = (
    rawText: string,
    existingWatchlist: WatchlistItem[]
): { toAdd: NewWatchlistItem[], duplicates: NewWatchlistItem[], unparsable: string[] } => {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { toAdd: [], duplicates: [], unparsable: [] };

    let currentHeaderDefaults: Partial<NewWatchlistItem> = {};
    const parsedItems: NewWatchlistItem[] = [];
    const unparsable: string[] = [];

    for (const line of lines) {
        if (isHeaderLine(line)) {
            currentHeaderDefaults = parseHeader(line);
        } else {
            const { item, rawLine } = parseLine(line, currentHeaderDefaults);
            if(item) {
                parsedItems.push(item);
            } else if(rawLine) {
                unparsable.push(rawLine);
            }
        }
    }
    
    const existingSet = new Set(
        existingWatchlist.map(item => `${item.title.trim().toLowerCase()}||${item.type.trim().toLowerCase()}`)
    );
    const seenInThisBatch = new Set<string>();

    const toAdd: NewWatchlistItem[] = [];
    const duplicates: NewWatchlistItem[] = [];

    for (const item of parsedItems) {
        const key = `${item.title.trim().toLowerCase()}||${item.type.trim().toLowerCase()}`;
        if (existingSet.has(key) || seenInThisBatch.has(key)) {
            duplicates.push(item);
        } else {
            toAdd.push(item);
            seenInThisBatch.add(key);
        }
    }

    return { toAdd, duplicates, unparsable };
};
