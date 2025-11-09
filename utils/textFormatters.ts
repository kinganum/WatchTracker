/**
 * Formats a string into a title-case format.
 * - Capitalizes the first letter of every word.
 * - Converts the rest of each word to lowercase.
 * - Preserves words containing numbers (e.g., "s5").
 * @param title The string to format.
 * @returns The formatted title string.
 */
export const formatTitle = (title: string): string => {
    if (!title) return '';
    return title
        .trim()
        .split(' ')
        .map(word => {
            if (word.length === 0) return '';
            // Preserve words containing numbers (like s5, part2)
            if (/\d/.test(word)) {
                return word;
            }
            // For all other words, capitalize the first letter and lowercase the rest.
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
};

/**
 * Intelligently parses various date strings into a Date object.
 * Returns null for un-parsable strings like "TBA".
 * @param dateString The date string from the AI.
 * @returns A Date object or null.
 */
export const parseReleaseDate = (dateString: string): Date | null => {
    if (!dateString || dateString.toLowerCase() === 'tba') return null;

    // Try direct parsing for "YYYY-MM-DD"
    const directDate = new Date(dateString);
    if (!isNaN(directDate.getTime())) {
        return directDate;
    }

    const lowerCaseDate = dateString.toLowerCase();
    const yearMatch = lowerCaseDate.match(/\b(202\d)\b/);
    if (!yearMatch) return null;
    const year = parseInt(yearMatch[0], 10);

    const months: { [key: string]: number } = {
        january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
        july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };

    for (const month in months) {
        if (lowerCaseDate.includes(month)) {
            const monthIndex = months[month];
            return new Date(year, monthIndex + 1, 0); // Get the last day of the month
        }
    }

    if (lowerCaseDate.includes('late')) return new Date(year, 11, 31);
    if (lowerCaseDate.includes('early')) return new Date(year, 2, 31);
    if (lowerCaseDate.includes('mid')) return new Date(year, 6, 1);

    if (lowerCaseDate.includes('q1')) return new Date(year, 2, 31);
    if (lowerCaseDate.includes('q2')) return new Date(year, 5, 30);
    if (lowerCaseDate.includes('q3')) return new Date(year, 8, 30);
    if (lowerCaseDate.includes('q4')) return new Date(year, 11, 31);
    
    // Fallback for just "YYYY"
    return new Date(year, 11, 31);
};