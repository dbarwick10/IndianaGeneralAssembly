// config.js
export const API_BASE_URL = 'http://localhost:3000';

export const PASSAGE_TERMS = [
    'public law',
    'signed by governor',
    'enacted',
    'chaptered',
    'signed by the president pro tempore',
    'signed by the speaker',
    'third reading: passed',
    'returned to the house',
    'returned to the senate'
];

export const LEADERSHIP_POSITIONS = [
    'Speaker',
    'President Pro Tempore',
    'Majority Leader',
    'Minority Leader'
];

export const COMMON_LEGISLATIVE_TERMS = new Set([
    'bill', 'senate', 'house', 'amends', 'concerning', 'provides', 'requires',
    'shall', 'means', 'person', 'under', 'include', 'within', 'pursuant',
    'state', 'effective', 'date', 'chapter', 'section', 'code'
]);

export const ANALYSIS_CONFIG = {
    batchSize: 5,
    wordCloud: {
        maxWords: 30,
        minWordLength: 3,
        scaleFactor: 20,
        config: {
            gridSize: 16,
            weightFactor: 1,
            fontFamily: 'Arial, sans-serif',
            color: '#2563eb',
            backgroundColor: 'transparent',
            rotateRatio: 0.5,
            rotationSteps: 2,
            shape: 'circle',
            minSize: 10,
            drawOutOfBound: false,
            shrinkToFit: true
        }
    },
    committees: {
        minTimeInCommittee: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
        maxTimeInCommittee: 365 * 24 * 60 * 60 * 1000 // 1 year in milliseconds
    },
    amendments: {
        successTerms: ['prevailed', 'adopted', 'passed'],
        failureTerms: ['failed', 'rejected', 'withdrawn']
    },
    billTypes: ['authored', 'coauthored', 'sponsored', 'cosponsored'],
    validBillPrefixes: ['SB', 'HB'],
    temporalAnalysis: {
        maxPeakDays: 5,
        activityThreshold: 3
    },
    maxDisplayItems: 10
};

export const UI_CONFIG = {
    loadingDelay: 100,
    maxDisplayedCollaborators: 5,
    maxDisplayedCommittees: 5,
    wordCloudHeight: 'h-64',
    gridLayouts: {
        overview: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        standard: 'grid-cols-1 md:grid-cols-2'
    }
};

export const stopWords = new Set([
    'with', 'that', 'this', 'and', 'the', 'for', 'are', 'from', 'has', 'have', 
    'was', 'were', 'will', 'which', 'their', 'they', 'them', 'there', 'been', 
    'its', 'than', 'what', 'when', 'where', 'who', 'whom', 'why', 'how', 'about', 
    'into', 'over', 'under', 'after', 'before', 'between', 'out', 'above', 'below', 
    'through', 'during', 'until', 'against', 'along', 'among', 'because', 'since', 
    'without', 'within', 'while', 'same', 'such', 'other', 'each', 'any', 'some', 
    'only', 'just', 'also', 'both', 'either', 'neither', 'not', 'no', 'yes', 'so', 
    'too', 'very', 'now', 'then', 'here', 'there', 'where', 'again', 'once', 'more', 
    'most', 'less', 'least', 'many', 'much', 'few', 'fewer', 'little', 'lot', 'lots', 
    'somewhat', 'somehow', 'someone', 'something', 'somewhere', 'anyone', 'anything', 
    'anywhere', 'everyone', 'everything', 'everywhere', 'none', 'nothing', 'nowhere', 
    'whatever', 'whenever', 'wherever', 'whoever', 'whomever', 'whose', 'whether', 
    'either', 'neither', 'nor', 'although', 'though', 'even', 'if', 'unless', 'until', 
    'whether', 'while', 'whereas', 'whenever', 'wherever', 'whatever', 'whoever', 
    'whomever', 'whose', 'whichever', 'however', 'therefore', 'thus', 'hence', 
    'accordingly', 'consequently', 'meanwhile', 'furthermore', 'moreover', 'nevertheless', 
    'nonetheless', 'otherwise', 'similarly', 'thereafter', 'thereby', 'therefore', 
    'therein', 'thereof', 'thereto', 'thereupon', 'whereby', 'wherein', 'whereupon', 
    'wherever', 'whichever', 'whoever', 'whomever', 'whose', 'within', 'without', 
    'would', 'could', 'should', 'might', 'must', 'shall', 'may', 'can', 'cannot', 
    'couldnt', 'wouldnt', 'shouldnt', 'mustnt', 'shant', 'mightnt', 'neednt', 'oughtnt', 
    'dare', 'dares', 'dared', 'daring', 'let', 'lets', 'letting', 'let', 'like', 'likes'
]);