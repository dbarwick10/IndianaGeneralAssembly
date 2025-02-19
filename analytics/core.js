// analytics/core.js
import { 
    PASSAGE_TERMS, 
    LEADERSHIP_POSITIONS, 
    ANALYSIS_CONFIG, 
    COMMON_LEGISLATIVE_TERMS,
    stopWords 
} from '../config.js';

import { 
    getPartyCategory, 
    extractCommittee,
    sortObjectByValue 
} from './helpers.js';

export const createInitialMetrics = () => ({
    totalBills: 0,
    billsByChamberAndParty: {
        senate: { republican: 0, democrat: 0, independent: 0 },
        house: { republican: 0, democrat: 0, independent: 0 }
    },
    billsByType: {
        authored: 0,
        coauthored: 0,
        sponsored: 0,
        cosponsored: 0
    },
    bipartisanMetrics: {
        totalBipartisanBills: 0,
        bipartisanPercentage: 0,
        crossPartyCollaborations: {},
        averageCollaboratorsPerBill: 0
    },
    legislatorActivity: {
        activeLegislators: new Set(),
        mostFrequentCollaborators: {},
        roleBasedCollaborations: {
            authorSponsor: {},
            authorCoauthor: {},
            sponsorCosponsor: {}
        },
        leadershipActivity: {},
        committeeLeadership: {}
    },
    successMetrics: {
        total: 0,
        passed: 0,
        vetoed: 0,
        pending: 0,
        averageTimeToPassage: 0,
        chamberPassage: {
            house: { passed: 0, failed: 0 },
            senate: { passed: 0, failed: 0 }
        },
        readingProgress: {
            firstReading: 0,
            secondReading: 0,
            thirdReading: 0
        }
    },
    committeeDynamics: {
        mostActiveCommittees: {},
        averageTimeInCommittee: 0,
        totalCommitteeTime: 0,
        committeeCount: 0,
        committeeReferrals: {},
        committeeReassignments: 0,
        multipleReferrals: 0,
        committeeMembership: {}
    },
    temporalAnalysis: {
        billsPerMonth: {},
        actionsByPhase: {
            introduction: {},
            committee: {},
            readings: {},
            passage: {}
        },
        sessionDays: new Set(),
        specialSessions: {},
        peakActivityDays: [],
        monthlyTrends: {},
        dayOfWeekActivity: Array(7).fill(0)
    },
    amendmentAnalysis: {
        totalAmendments: 0,
        successfulAmendments: 0,
        amendmentsByParty: {},
        amendmentsByStage: {
            committee: { total: 0, successful: 0 },
            secondReading: { total: 0, successful: 0 },
            thirdReading: { total: 0, successful: 0 }
        },
        amendmentAuthors: {}
    },
    wordFrequency: {}
});

export const getLegislatorMetrics = (billsSet) => {
    const metrics = createInitialMetrics();

    try {
        const billsArray = Array.from(billsSet).map(bill => JSON.parse(bill));
        metrics.totalBills = billsArray.length;

        billsArray.forEach(bill => processBill(bill, metrics));
        finalizeMetrics(metrics);
    } catch (error) {
        console.error('Error in getLegislatorMetrics:', error);
    }

    return metrics;
};

const processBill = (bill, metrics) => {
    // Basic bill type counting
    if (bill.type) {
        metrics.billsByType[bill.type]++;
    }

    if (!bill.details) return;

    // Chamber and Party Analysis
    const chamber = bill.billName.startsWith('S') ? 'senate' : 'house';
    if (bill.details.authors?.[0]) {
        const primaryAuthor = bill.details.authors[0];
        const party = getPartyCategory(primaryAuthor.party);
        metrics.billsByChamberAndParty[chamber][party]++;
    }

    // Collect all participants and analyze collaborations
    const participants = getAllParticipants(bill.details);
    processParticipants(participants, metrics);
    processCollaborations(participants, metrics);
    processLeadershipActivity(participants, metrics);

    // Process bill actions if available
    if (bill.actions?.length > 0) {
        processActions(bill.actions, metrics, chamber, participants);
    }

    // Process bill content
    if (bill.details?.latestVersion?.digest) {
        processDigest(bill.details.latestVersion.digest, metrics);
    }
};

const getAllParticipants = (billDetails) => {
    return [
        ...(billDetails.authors || []),
        ...(billDetails.coauthors || []),
        ...(billDetails.sponsors || []),
        ...(billDetails.cosponsors || [])
    ];
};

const processParticipants = (participants, metrics) => {
    participants.forEach(participant => {
        if (participant.fullName) {
            metrics.legislatorActivity.activeLegislators.add(participant.fullName);
            
            // Track committee leadership if applicable
            if (participant.committees) {
                participant.committees.forEach(committee => {
                    if (committee.role?.toLowerCase().includes('chair')) {
                        metrics.legislatorActivity.committeeLeadership[participant.fullName] = 
                            (metrics.legislatorActivity.committeeLeadership[participant.fullName] || 0) + 1;
                    }
                });
            }
        }
    });
};

const processCollaborations = (participants, metrics) => {
    if (participants.length > 1) {
        // Bipartisan analysis
        const uniqueParties = new Set(participants.map(p => getPartyCategory(p.party)));
        if (uniqueParties.size > 1) {
            metrics.bipartisanMetrics.totalBipartisanBills++;
            processPartyCollaborations(uniqueParties, metrics);
        }

        // Track collaborator relationships
        processCollaboratorRelationships(participants, metrics);

        metrics.bipartisanMetrics.averageCollaboratorsPerBill += participants.length;
    }
};

const processPartyCollaborations = (parties, metrics) => {
    const partyArray = Array.from(parties);
    for (let i = 0; i < partyArray.length - 1; i++) {
        for (let j = i + 1; j < partyArray.length; j++) {
            const key = [partyArray[i], partyArray[j]].sort().join('-');
            metrics.bipartisanMetrics.crossPartyCollaborations[key] = 
                (metrics.bipartisanMetrics.crossPartyCollaborations[key] || 0) + 1;
        }
    }
};

const processCollaboratorRelationships = (participants, metrics) => {
    for (let i = 0; i < participants.length - 1; i++) {
        for (let j = i + 1; j < participants.length; j++) {
            if (participants[i].fullName && participants[j].fullName) {
                const key = [participants[i].fullName, participants[j].fullName]
                    .sort()
                    .join('-');
                metrics.legislatorActivity.mostFrequentCollaborators[key] = 
                    (metrics.legislatorActivity.mostFrequentCollaborators[key] || 0) + 1;
            }
        }
    }
};

const processLeadershipActivity = (participants, metrics) => {
    participants.forEach(participant => {
        if (participant.position) {
            LEADERSHIP_POSITIONS.forEach(position => {
                if (participant.position.includes(position)) {
                    metrics.legislatorActivity.leadershipActivity[participant.fullName] = 
                        (metrics.legislatorActivity.leadershipActivity[participant.fullName] || 0) + 1;
                }
            });
        }
    });
};

const processActions = (actions, metrics, chamber, participants) => {
    metrics.successMetrics.total++;
    
    let committeeState = {
        currentCommittee: null,
        startTime: null,
        referrals: new Set()
    };

    actions.forEach((action, index) => {
        const desc = action.description.toLowerCase();
        const actionDate = new Date(action.date);
        
        // Track session days and daily activity
        metrics.temporalAnalysis.sessionDays.add(action.day);
        metrics.temporalAnalysis.dayOfWeekActivity[actionDate.getDay()]++;

        // Process various action types
        if (isPassageAction(desc)) {
            processPassageAction(desc, chamber, metrics, actions[0].date, action.date);
        }

        processReadingProgress(desc, metrics);
        processCommitteeAction(desc, action, committeeState, metrics);
        
        if (desc.includes('amendment')) {
            processAmendment(desc, metrics, participants, getCurrentStage(desc));
        }

        processTemporalData(action, desc, metrics);
    });
};

const isPassageAction = (desc) => {
    return PASSAGE_TERMS.some(term => desc.includes(term));
};

const processPassageAction = (desc, chamber, metrics, firstActionDate, currentActionDate) => {
    if (desc.includes('third reading: passed')) {
        metrics.successMetrics.chamberPassage[chamber].passed++;
    } else if (desc.includes('third reading: failed')) {
        metrics.successMetrics.chamberPassage[chamber].failed++;
    }

    if (isPassageAction(desc)) {
        metrics.successMetrics.passed++;
        const daysToPassage = (new Date(currentActionDate) - new Date(firstActionDate)) / 
            (1000 * 60 * 60 * 24);
        metrics.successMetrics.averageTimeToPassage += daysToPassage;
    } else if (desc.includes('veto')) {
        metrics.successMetrics.vetoed++;
    } else {
        metrics.successMetrics.pending++;
    }
};

const processReadingProgress = (desc, metrics) => {
    if (desc.includes('first reading')) {
        metrics.successMetrics.readingProgress.firstReading++;
    } else if (desc.includes('second reading')) {
        metrics.successMetrics.readingProgress.secondReading++;
    } else if (desc.includes('third reading')) {
        metrics.successMetrics.readingProgress.thirdReading++;
    }
};

const processCommitteeAction = (desc, action, committeeState, metrics) => {
    if (desc.includes('committee')) {
        const committee = extractCommittee(action.description);
        if (committee) {
            metrics.committeeDynamics.mostActiveCommittees[committee] = 
                (metrics.committeeDynamics.mostActiveCommittees[committee] || 0) + 1;

            if (desc.includes('referred')) {
                committeeState.referrals.add(committee);
                if (committeeState.referrals.size > 1) {
                    metrics.committeeDynamics.multipleReferrals++;
                }

                if (committeeState.currentCommittee && committeeState.currentCommittee !== committee) {
                    metrics.committeeDynamics.committeeReassignments++;
                }

                committeeState.currentCommittee = committee;
                committeeState.startTime = new Date(action.date);
            }

            if (desc.includes('committee report') && committeeState.startTime) {
                const committeeTime = new Date(action.date) - committeeState.startTime;
                metrics.committeeDynamics.totalCommitteeTime += committeeTime;
                metrics.committeeDynamics.committeeCount++;
                committeeState.startTime = null;
            }
        }
    }
};

const processAmendment = (desc, metrics, participants, stage) => {
    metrics.amendmentAnalysis.totalAmendments++;
    
    const isSuccessful = ANALYSIS_CONFIG.amendments.successTerms
        .some(term => desc.includes(term)) &&
        !ANALYSIS_CONFIG.amendments.failureTerms
        .some(term => desc.includes(term));

    if (isSuccessful) {
        metrics.amendmentAnalysis.successfulAmendments++;
        metrics.amendmentAnalysis.amendmentsByStage[stage].successful++;
    }
    
    metrics.amendmentAnalysis.amendmentsByStage[stage].total++;

    const amendmentAuthorMatch = desc.match(/Amendment #\d+ \(([^)]+)\)/);
    if (amendmentAuthorMatch) {
        const authorName = amendmentAuthorMatch[1];
        const author = participants.find(p => p.fullName.includes(authorName));
        if (author) {
            const party = getPartyCategory(author.party);
            metrics.amendmentAnalysis.amendmentsByParty[party] = 
                (metrics.amendmentAnalysis.amendmentsByParty[party] || 0) + 1;
            
            metrics.amendmentAnalysis.amendmentAuthors[authorName] = 
                (metrics.amendmentAnalysis.amendmentAuthors[authorName] || 0) + 1;
        }
    }
};

const getCurrentStage = (desc) => {
    if (desc.includes('committee')) return 'committee';
    if (desc.includes('second reading')) return 'secondReading';
    if (desc.includes('third reading')) return 'thirdReading';
    return 'committee';
};

const processTemporalData = (action, desc, metrics) => {
    const date = new Date(action.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    metrics.temporalAnalysis.billsPerMonth[monthKey] = 
        (metrics.temporalAnalysis.billsPerMonth[monthKey] || 0) + 1;

    // Track activity by phase
    const phase = getActionPhase(desc);
    if (phase) {
        metrics.temporalAnalysis.actionsByPhase[phase][monthKey] = 
            (metrics.temporalAnalysis.actionsByPhase[phase][monthKey] || 0) + 1;
    }

    // Track special sessions
    if (desc.includes('special session')) {
        const sessionMatch = desc.match(/special session [#]?(\d+)/i);
        if (sessionMatch) {
            const sessionNum = sessionMatch[1];
            metrics.temporalAnalysis.specialSessions[sessionNum] = 
                (metrics.temporalAnalysis.specialSessions[sessionNum] || 0) + 1;
        }
    }
};

const getActionPhase = (desc) => {
    if (desc.includes('introduced')) return 'introduction';
    if (desc.includes('committee')) return 'committee';
    if (desc.includes('reading')) return 'readings';
    if (isPassageAction(desc)) return 'passage';
    return null;
};

const processDigest = (digest, metrics) => {
    const words = digest.toLowerCase().match(/\b\w+\b/g) || [];
    
    words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word) && !COMMON_LEGISLATIVE_TERMS.has(word)) {
            metrics.wordFrequency[word] = (metrics.wordFrequency[word] || 0) + 1;
        }
    });
};

const finalizeMetrics = (metrics) => {
    if (metrics.totalBills > 0) {
        calculatePercentages(metrics);
        calculateAverages(metrics);
        normalizeTemporalData(metrics);
    }

    sortMetricsCollections(metrics);
    calculatePeakActivity(metrics);
};

const calculatePercentages = (metrics) => {
    // Bipartisan percentage
    metrics.bipartisanMetrics.bipartisanPercentage = 
        (metrics.bipartisanMetrics.totalBipartisanBills / metrics.totalBills) * 100;

    // Success rate percentage
    metrics.successMetrics.passageRate = 
        (metrics.successMetrics.passed / metrics.successMetrics.total) * 100;

    // Amendment success rate
    metrics.amendmentAnalysis.successRate = 
        (metrics.amendmentAnalysis.successfulAmendments / metrics.amendmentAnalysis.totalAmendments) * 100;

    // Chamber-specific passage rates
    ['house', 'senate'].forEach(chamber => {
        const chamberTotal = metrics.successMetrics.chamberPassage[chamber].passed + 
                           metrics.successMetrics.chamberPassage[chamber].failed;
        if (chamberTotal > 0) {
            metrics.successMetrics.chamberPassage[chamber].rate = 
                (metrics.successMetrics.chamberPassage[chamber].passed / chamberTotal) * 100;
        }
    });
};

const calculateAverages = (metrics) => {
    // Average collaborators per bill
    if (metrics.totalBills > 0) {
        metrics.bipartisanMetrics.averageCollaboratorsPerBill /= metrics.totalBills;
    }

    // Average time to passage
    if (metrics.successMetrics.passed > 0) {
        metrics.successMetrics.averageTimeToPassage /= metrics.successMetrics.passed;
    }

    // Average committee time
    if (metrics.committeeDynamics.committeeCount > 0) {
        metrics.committeeDynamics.averageTimeInCommittee = 
            metrics.committeeDynamics.totalCommitteeTime / 
            metrics.committeeDynamics.committeeCount / 
            (1000 * 60 * 60 * 24); // Convert to days
    }

    // Average amendments per bill
    if (metrics.totalBills > 0) {
        metrics.amendmentAnalysis.averageAmendmentsPerBill = 
            metrics.amendmentAnalysis.totalAmendments / metrics.totalBills;
    }
};

const normalizeTemporalData = (metrics) => {
    // Convert session days to array for easier processing
    metrics.temporalAnalysis.sessionDaysList = Array.from(metrics.temporalAnalysis.sessionDays).sort();

    // Calculate monthly averages
    const monthlyTotals = {};
    const monthlyDays = {};

    Object.entries(metrics.temporalAnalysis.billsPerMonth).forEach(([monthKey, count]) => {
        const month = monthKey.split('-')[1];
        monthlyTotals[month] = (monthlyTotals[month] || 0) + count;
        monthlyDays[month] = (monthlyDays[month] || 0) + 1;
    });

    metrics.temporalAnalysis.monthlyAverages = Object.keys(monthlyTotals).reduce((acc, month) => {
        acc[month] = monthlyTotals[month] / monthlyDays[month];
        return acc;
    }, {});

    // Normalize day of week activity
    const totalDays = metrics.temporalAnalysis.dayOfWeekActivity.reduce((a, b) => a + b, 0);
    if (totalDays > 0) {
        metrics.temporalAnalysis.dayOfWeekActivity = 
            metrics.temporalAnalysis.dayOfWeekActivity.map(count => (count / totalDays) * 100);
    }
};

const sortMetricsCollections = (metrics) => {
    // Sort collaborators by frequency
    metrics.legislatorActivity.mostFrequentCollaborators = 
        sortObjectByValue(metrics.legislatorActivity.mostFrequentCollaborators);

    // Sort committee activity
    metrics.committeeDynamics.mostActiveCommittees = 
        sortObjectByValue(metrics.committeeDynamics.mostActiveCommittees);

    // Sort amendment authors
    metrics.amendmentAnalysis.amendmentAuthors = 
        sortObjectByValue(metrics.amendmentAnalysis.amendmentAuthors);

    // Sort leadership activity
    metrics.legislatorActivity.leadershipActivity = 
        sortObjectByValue(metrics.legislatorActivity.leadershipActivity);

    // Limit collections to configured sizes
    Object.keys(metrics.legislatorActivity).forEach(key => {
        if (typeof metrics.legislatorActivity[key] === 'object' && 
            !metrics.legislatorActivity[key] instanceof Set) {
            metrics.legislatorActivity[key] = 
                limitObjectSize(metrics.legislatorActivity[key], ANALYSIS_CONFIG.maxDisplayItems);
        }
    });
};

const calculatePeakActivity = (metrics) => {
    // Find peak activity days
    const dailyActivity = {};
    metrics.temporalAnalysis.sessionDaysList.forEach(day => {
        Object.values(metrics.temporalAnalysis.actionsByPhase).forEach(phaseData => {
            if (phaseData[day]) {
                dailyActivity[day] = (dailyActivity[day] || 0) + phaseData[day];
            }
        });
    });

    metrics.temporalAnalysis.peakActivityDays = Object.entries(dailyActivity)
        .sort(([, a], [, b]) => b - a)
        .slice(0, ANALYSIS_CONFIG.temporalAnalysis.maxPeakDays)
        .map(([date, count]) => ({ date, count }));

    // Calculate activity thresholds
    const activityValues = Object.values(dailyActivity);
    metrics.temporalAnalysis.activityStats = {
        average: activityValues.reduce((a, b) => a + b, 0) / activityValues.length,
        median: calculateMedian(activityValues),
        peak: Math.max(...activityValues)
    };
};

const calculateMedian = (values) => {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
};

const limitObjectSize = (obj, size) => {
    return Object.entries(obj)
        .sort(([, a], [, b]) => b - a)
        .slice(0, size)
        .reduce((acc, [key, value]) => ({...acc, [key]: value}), {});
};

export const processWordCloud = (wordFrequency) => {
    if (!wordFrequency || Object.keys(wordFrequency).length === 0) {
        console.log('No word frequency data available');
        return [];
    }

    const filteredWords = Object.entries(wordFrequency)
        .filter(([word]) => {
            if (!word) return false;
            
            return !stopWords.has(word) && 
                   !COMMON_LEGISLATIVE_TERMS.has(word) &&
                   word.length > ANALYSIS_CONFIG.wordCloud.minWordLength &&
                   /^[a-z]+$/i.test(word);
        });
    
    if (filteredWords.length === 0) {
        console.log('No significant words found after filtering');
        return [];
    }
    
    return filteredWords
        .sort(([, a], [, b]) => b - a)
        .slice(0, ANALYSIS_CONFIG.wordCloud.maxWords)
        .map(([word, count]) => {
            const scaledCount = Math.log(count + 1) * ANALYSIS_CONFIG.wordCloud.scaleFactor;
            return [word, scaledCount];
        });
};