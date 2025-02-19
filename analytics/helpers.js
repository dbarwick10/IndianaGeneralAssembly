// analytics/helpers.js
import { PASSAGE_TERMS, COMMON_LEGISLATIVE_TERMS, stopWords } from '../config.js';

export const getPartyCategory = (party) => {
    if (!party) return 'independent';
    const partyLower = party.toLowerCase();
    if (partyLower.includes('republican')) return 'republican';
    if (partyLower.includes('democrat')) return 'democrat';
    return 'independent';
};

export const extractCommittee = (description) => {
    const patterns = [
        /(?:referred to|in|from) (?:the )?([A-Za-z, ]+?) Committee/i,
        /([A-Za-z, ]+?) Committee/i,
        /Committee on ([A-Za-z, ]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    return null;
};

export const getAllParticipants = (billDetails) => {
    return [
        ...(billDetails.authors || []),
        ...(billDetails.coauthors || []),
        ...(billDetails.sponsors || []),
        ...(billDetails.cosponsors || [])
    ];
};

export const isPassageAction = (desc) => {
    return PASSAGE_TERMS.some(term => desc.includes(term));
};

export const getCurrentStage = (desc) => {
    if (desc.includes('committee')) return 'committee';
    if (desc.includes('second reading')) return 'secondReading';
    if (desc.includes('third reading')) return 'thirdReading';
    return 'committee';
};

export const calculatePeakActivityDays = (billsPerMonth) => {
    return Object.entries(billsPerMonth)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([date, count]) => ({ date, count }));
};

export const sortObjectByValue = (obj) => {
    return Object.entries(obj)
        .sort(([, a], [, b]) => b - a)
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});
};

export const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    });
};

export const abbreviateTitle = (name) => {
    return name
        .replace(/\bRepresentative\b/g, 'Rep.')
        .replace(/\bSenator\b/g, 'Sen.');
};

export const filterWords = (wordFrequency) => {
    return Object.entries(wordFrequency)
        .filter(([word]) => {
            if (!word) return false;
            
            return !stopWords.has(word) && 
                   !COMMON_LEGISLATIVE_TERMS.has(word) &&
                   word.length > 2 &&
                   /^[a-z]+$/i.test(word);
        });
};

export const scaleWordFrequencies = (filteredWords) => {
    return filteredWords
        .sort(([, a], [, b]) => b - a)
        .slice(0, 30)
        .map(([word, count]) => {
            const scaledCount = Math.log(count + 1) * 20;
            return [word, scaledCount];
        });
};

export const logSampleWords = (wordFrequency) => {
    console.log('Sample of original words:', 
        Object.entries(wordFrequency)
            .slice(0, 10)
            .map(([word, count]) => `${word}: ${count}`)
    );
};