// Global state
let legislators = [];
let bills = new Set();
let loading = false;
let searchTerm = '';
let suggestions = [];
let openBills = {};
const billDetailsCache = new Map();
const billActionsCache = new Map();

const stopWords = new Set([
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

// Initialize the application
window.onload = async () => {
    try {
        // Fetch legislators from the backend
        const response = await fetch(`http://localhost:3000/legislators`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        legislators = data.items || []; // Ensure the response has an `items` array
    } catch (error) {
        console.error('Error during page load:', error);
    }
};

// Utility Functions
const abbreviateTitle = (name) => {
    return name
        .replace(/\bRepresentative\b/g, 'Rep.')
        .replace(/\bSenator\b/g, 'Sen.');
};

const formatDateTime = (dateTimeString) => {
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

const clearResults = () => {
    // Clear the results container
    document.getElementById('results').innerHTML = '';

    // Hide the "no results" message
    document.getElementById('noResults').classList.add('hidden');

    // Reset the bills and openBills state
    bills = new Set();
    openBills = {};

    // Remove all analytics containers
    const analyticsContainers = document.querySelectorAll('.analytics-container');
    analyticsContainers.forEach(container => container.remove());
    
    // Remove word cloud container
    const wordCloudContainer = document.querySelector('.bill-card .title');
    if (wordCloudContainer && wordCloudContainer.textContent === 'Word Cloud') {
        wordCloudContainer.closest('.bill-card').remove();
    }
};

// Analytics Functions
const getLegislatorMetrics = (billsSet) => {
    const metrics = {
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
            mostFrequentCollaborators: {}
        },
        successMetrics: {
            total: 0,
            passed: 0,
            vetoed: 0,
            pending: 0,
            averageTimeToPassage: 0
        },
        committeeDynamics: {
            mostActiveCommittees: {},
            averageTimeInCommittee: 0,
            totalCommitteeTime: 0,
            committeeCount: 0
        },
        temporalAnalysis: {
            billsPerMonth: {},
            seasonalTrends: {}
        },
        amendmentAnalysis: {
            totalAmendments: 0,
            successfulAmendments: 0,
            amendmentsByParty: {}
        },
        wordFrequency: {}
    };

    try {
        const billsArray = Array.from(billsSet).map(bill => JSON.parse(bill));
        metrics.totalBills = billsArray.length;

        // Process each bill
        billsArray.forEach(bill => {
            // Count bills by type
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

            // Collect all participants
            const participants = [
                ...(bill.details.authors || []),
                ...(bill.details.coauthors || []),
                ...(bill.details.sponsors || []),
                ...(bill.details.cosponsors || [])
            ];

            // Track active legislators
            participants.forEach(participant => {
                if (participant.fullName) {
                    metrics.legislatorActivity.activeLegislators.add(participant.fullName);
                }
            });

            // Bipartisan Analysis
            if (participants.length > 1) {
                const uniqueParties = new Set(participants.map(p => getPartyCategory(p.party)));
                if (uniqueParties.size > 1) {
                    metrics.bipartisanMetrics.totalBipartisanBills++;
                    
                    // Track cross-party collaborations
                    const partyArray = Array.from(uniqueParties);
                    for (let i = 0; i < partyArray.length - 1; i++) {
                        for (let j = i + 1; j < partyArray.length; j++) {
                            const key = [partyArray[i], partyArray[j]].sort().join('-');
                            metrics.bipartisanMetrics.crossPartyCollaborations[key] = 
                                (metrics.bipartisanMetrics.crossPartyCollaborations[key] || 0) + 1;
                        }
                    }
                }

                // Track collaborator relationships
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

                metrics.bipartisanMetrics.averageCollaboratorsPerBill += participants.length;
            }

            // Bill Status and Actions Analysis
            if (bill.actions?.length > 0) {
                const actions = bill.actions;
                metrics.successMetrics.total++;
                
                // Determine bill status
                const isPassedOrSigned = actions.some(action => {
                    const desc = action.description.toLowerCase();
                    return desc.includes('public law') || 
                           desc.includes('signed by governor') ||
                           desc.includes('enacted') ||
                           desc.includes('chaptered');
                });
                
                const isVetoed = actions.some(action => 
                    action.description.toLowerCase().includes('veto'));
                
                if (isPassedOrSigned) {
                    metrics.successMetrics.passed++;
                    
                    // Calculate time to passage
                    const firstAction = new Date(actions[0].date);
                    const lastAction = new Date(actions[actions.length - 1].date);
                    const daysToPassage = (lastAction - firstAction) / (1000 * 60 * 60 * 24);
                    metrics.successMetrics.averageTimeToPassage += daysToPassage;
                } else if (isVetoed) {
                    metrics.successMetrics.vetoed++;
                } else {
                    metrics.successMetrics.pending++;
                }

                // Committee Analysis
                let lastCommitteeStart = null;
                let currentCommittee = null;

                actions.forEach(action => {
                    const desc = action.description.toLowerCase();
                    const actionDate = new Date(action.date);
                    
                    // Committee tracking
                    if (desc.includes('committee')) {
                        const committee = extractCommittee(action.description);
                        if (committee) {
                            metrics.committeeDynamics.mostActiveCommittees[committee] = 
                                (metrics.committeeDynamics.mostActiveCommittees[committee] || 0) + 1;
                            
                            if (lastCommitteeStart && currentCommittee) {
                                const committeeTime = actionDate - lastCommitteeStart;
                                metrics.committeeDynamics.totalCommitteeTime += committeeTime;
                                metrics.committeeDynamics.committeeCount++;
                            }
                            
                            lastCommitteeStart = actionDate;
                            currentCommittee = committee;
                        }
                    }

                    // Amendment tracking
                    if (desc.includes('amendment')) {
                        metrics.amendmentAnalysis.totalAmendments++;
                        
                        // Check for successful amendments
                        if (desc.includes('prevailed') || 
                            desc.includes('adopted') || 
                            (desc.includes('passed') && !desc.includes('failed'))) {
                            metrics.amendmentAnalysis.successfulAmendments++;
                        }
                        
                        // Track amendment by party if author is mentioned
                        const amendmentAuthorMatch = desc.match(/Amendment #\d+ \(([^)]+)\)/);
                        if (amendmentAuthorMatch) {
                            const authorName = amendmentAuthorMatch[1];
                            // Find the legislator in participants list to get their party
                            const author = participants.find(p => p.fullName.includes(authorName));
                            if (author) {
                                const party = getPartyCategory(author.party);
                                metrics.amendmentAnalysis.amendmentsByParty[party] = 
                                    (metrics.amendmentAnalysis.amendmentsByParty[party] || 0) + 1;
                            }
                        }
                    }

                    // Temporal Analysis
                    const monthKey = `${actionDate.getFullYear()}-${String(actionDate.getMonth() + 1).padStart(2, '0')}`;
                    metrics.temporalAnalysis.billsPerMonth[monthKey] = 
                        (metrics.temporalAnalysis.billsPerMonth[monthKey] || 0) + 1;

                    const month = String(actionDate.getMonth() + 1).padStart(2, '0');
                    metrics.temporalAnalysis.seasonalTrends[month] = 
                        (metrics.temporalAnalysis.seasonalTrends[month] || 0) + 1;
                });
            }

            // Word Frequency Analysis
            if (bill.details?.latestVersion?.digest) {
                const words = bill.details.latestVersion.digest.toLowerCase()
                    .match(/\b\w+\b/g) || [];
                
                words.forEach(word => {
                    if (word.length > 3 && !stopWords.has(word)) {
                        metrics.wordFrequency[word] = (metrics.wordFrequency[word] || 0) + 1;
                    }
                });
            }
        });

        // Calculate final metrics
        if (metrics.totalBills > 0) {
            metrics.bipartisanMetrics.bipartisanPercentage = 
                (metrics.bipartisanMetrics.totalBipartisanBills / metrics.totalBills) * 100;

            metrics.bipartisanMetrics.averageCollaboratorsPerBill /= metrics.totalBills;

            if (metrics.successMetrics.passed > 0) {
                metrics.successMetrics.averageTimeToPassage /= metrics.successMetrics.passed;
            }

            if (metrics.committeeDynamics.committeeCount > 0) {
                metrics.committeeDynamics.averageTimeInCommittee = 
                    metrics.committeeDynamics.totalCommitteeTime / 
                    metrics.committeeDynamics.committeeCount / 
                    (1000 * 60 * 60 * 24); // Convert to days
            }
        }

        // Sort collaborator relationships
        metrics.legislatorActivity.mostFrequentCollaborators = 
            Object.entries(metrics.legislatorActivity.mostFrequentCollaborators)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        // Sort committee activity
        metrics.committeeDynamics.mostActiveCommittees = 
            Object.entries(metrics.committeeDynamics.mostActiveCommittees)
                .sort(([, a], [, b]) => b - a)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    } catch (error) {
        console.error('Error in getLegislatorMetrics:', error);
    }

    return metrics;
};

const getPartyCategory = (party) => {
    if (!party) return 'independent';
    const partyLower = party.toLowerCase();
    if (partyLower.includes('republican')) return 'republican';
    if (partyLower.includes('democrat')) return 'democrat';
    return 'independent';
};

const extractCommittee = (description) => {
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

const getAllParticipants = (bill) => {
    return [
        ...(bill.authors || []),
        ...(bill.coauthors || []),
        ...(bill.sponsors || []),
        ...(bill.cosponsors || [])
    ];
};

const trackPartyCollaborations = (parties, collaborations) => {
    const partyArray = Array.from(parties);
    for (let i = 0; i < partyArray.length; i++) {
        for (let j = i + 1; j < partyArray.length; j++) {
            const key = [partyArray[i], partyArray[j]].sort().join('-');
            collaborations[key] = (collaborations[key] || 0) + 1;
        }
    }
};

const trackCollaboratorRelationships = (participants, relationships) => {
    participants.forEach((p1, i) => {
        participants.slice(i + 1).forEach(p2 => {
            const key = [p1.fullName, p2.fullName].sort().join('-');
            relationships[key] = (relationships[key] || 0) + 1;
        });
    });
};

const analyzeSuccessRate = (bill, successMetrics) => {
    successMetrics.total++;
    
    const actions = bill.actions || [];
    const isPublicLaw = actions.some(a => 
        a.description.toLowerCase().includes('public law'));
    const isVetoed = actions.some(a => 
        a.description.toLowerCase().includes('veto'));
    
    if (isPublicLaw) successMetrics.passed++;
    else if (isVetoed) successMetrics.vetoed++;
    else successMetrics.pending++;

    // Track passage time if bill passed
    if (isPublicLaw && actions.length >= 2) {
        const firstAction = new Date(actions[0].date);
        const lastAction = new Date(actions[actions.length - 1].date);
        successMetrics.averageTimeToPassage += 
            (lastAction - firstAction) / (1000 * 60 * 60 * 24); // Convert to days
    }
};

const analyzeCommitteeActivity = (actions, committeeDynamics) => {
    let lastCommittee = null;
    let committeeStartTime = null;

    actions.forEach(action => {
        const desc = action.description.toLowerCase();
        if (desc.includes('committee')) {
            const committee = extractCommittee(action.description);
            if (committee) {
                committeeDynamics.mostActiveCommittees[committee] = 
                    (committeeDynamics.mostActiveCommittees[committee] || 0) + 1;
                
                if (lastCommittee && committeeStartTime) {
                    const timeInCommittee = new Date(action.date) - committeeStartTime;
                    committeeDynamics.averageTimeInCommittee += timeInCommittee;
                }
                
                lastCommittee = committee;
                committeeStartTime = new Date(action.date);
            }
        }
    });
};

const analyzeTemporalPatterns = (actions, temporalAnalysis) => {
    actions.forEach(action => {
        const date = new Date(action.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        temporalAnalysis.billsPerMonth[monthKey] = 
            (temporalAnalysis.billsPerMonth[monthKey] || 0) + 1;
    });
};

const analyzeContent = (digest, metrics) => {
    const words = digest.toLowerCase().match(/\b\w+\b/g) || [];
    words.forEach(word => {
        if (word.length > 3 && !stopWords.has(word)) {
            metrics.wordFrequency[word] = (metrics.wordFrequency[word] || 0) + 1;
        }
    });
};

const analyzeAmendments = (actions, amendmentAnalysis) => {
    actions.forEach(action => {
        const desc = action.description.toLowerCase();
        if (desc.includes('amendment')) {
            amendmentAnalysis.totalAmendments++;
            if (desc.includes('adopted') || desc.includes('passed') || desc.includes('prevailed')) {
                amendmentAnalysis.successfulAmendments++;
            }
        }
    });
};

const finalizeMetrics = (metrics, totalBills) => {
    // Calculate bipartisan percentage
    metrics.bipartisanMetrics.bipartisanPercentage = 
        (metrics.bipartisanMetrics.totalBipartisanBills / totalBills) * 100;

    // Calculate average collaborators
    metrics.bipartisanMetrics.averageCollaboratorsPerBill /= totalBills;

    // Calculate average time metrics
    if (metrics.successMetrics.passed > 0) {
        metrics.successMetrics.averageTimeToPassage /= metrics.successMetrics.passed;
    }

    // Sort and limit most frequent collaborators
    metrics.legislatorActivity.mostFrequentCollaborators = 
        Object.entries(metrics.legislatorActivity.mostFrequentCollaborators)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    // Calculate seasonal trends
    const monthlyAverages = {};
    Object.entries(metrics.temporalAnalysis.billsPerMonth).forEach(([monthKey, count]) => {
        const month = monthKey.split('-')[1];
        monthlyAverages[month] = (monthlyAverages[month] || 0) + count;
    });
    metrics.temporalAnalysis.seasonalTrends = monthlyAverages;
};

const processWordCloud = (wordFrequency) => {
    // Debug: Log initial word count
    console.log('Initial word count:', Object.keys(wordFrequency).length);
    
    const commonLegislativeTerms = new Set(['bill', 'senate', 'house', 'amends', 'concerning', 'provides', 'requires']);
    
    // More lenient filtering
    const filteredWords = Object.entries(wordFrequency)
        .filter(([word]) => {
            const isValid = 
                !stopWords.has(word) && 
                !commonLegislativeTerms.has(word) &&
                word.length > 2 && // Reduced from 3 to 2
                /^[a-z]+$/i.test(word); // Made case insensitive
            
            return isValid;
        });
    
    // Debug: Log filtered word count
    console.log('Filtered word count:', filteredWords.length);
    
    if (filteredWords.length === 0) {
        // Debug: Log a sample of original words to see what we're filtering out
        console.log('Sample of original words:', 
            Object.entries(wordFrequency)
                .slice(0, 10)
                .map(([word, count]) => `${word}: ${count}`)
        );
        return [];
    }
    
    return filteredWords
        .sort(([, a], [, b]) => b - a)
        .slice(0, 30)
        .map(([word, count]) => {
            const scaledCount = Math.log(count + 1) * 20;
            return [word, scaledCount];
        });
};

const displayAnalytics = () => {
    // Remove existing analytics
    const existingAnalytics = document.querySelectorAll('.analytics-container, .bill-card');
    existingAnalytics.forEach(container => {
        if (container.querySelector('.title')?.textContent === 'Word Cloud' ||
            container.querySelector('.title')?.textContent.includes('Combined Analytics')) {
            container.remove();
        }
    });

    // Combine bills from all searched legislators
    const combinedBills = new Set();
    bills.forEach(bill => combinedBills.add(bill));

    // Calculate metrics
    const metrics = getLegislatorMetrics(combinedBills);

    // Get search context
    const year = document.getElementById('yearInput').value;
    const searchedLegislators = searchTerm.split(',').map(name => name.trim());

    // Generate the analytics HTML
    const analyticsHTML = `
        <div class="analytics-container space-y-8">
            <!-- Overview Section -->
            <div class="bill-card">
                <h3 class="title">Legislative Overview for ${searchedLegislators.join(' & ')} (${year})</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <h4 class="font-semibold mb-2">Bill Distribution</h4>
                        <div class="space-y-1">
                            <p>Total Bills: ${metrics.totalBills}</p>
                            <p>Authored: ${metrics.billsByType.authored}</p>
                            <p>Coauthored: ${metrics.billsByType.coauthored}</p>
                            <p>Sponsored: ${metrics.billsByType.sponsored}</p>
                            <p>Cosponsored: ${metrics.billsByType.cosponsored}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Chamber Activity</h4>
                        <div class="space-y-1">
                            <p>Senate Bills (R): ${metrics.billsByChamberAndParty.senate.republican}</p>
                            <p>Senate Bills (D): ${metrics.billsByChamberAndParty.senate.democrat}</p>
                            <p>House Bills (R): ${metrics.billsByChamberAndParty.house.republican}</p>
                            <p>House Bills (D): ${metrics.billsByChamberAndParty.house.democrat}</p>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-semibold mb-2">Success Metrics</h4>
                        <div class="space-y-1">
                            <p>Passed: ${metrics.successMetrics.passed} (${((metrics.successMetrics.passed / metrics.successMetrics.total) * 100).toFixed(1)}%)</p>
                            <p>Pending: ${metrics.successMetrics.pending}</p>
                            <p>Vetoed: ${metrics.successMetrics.vetoed}</p>
                            <p>Avg. Days to Passage: ${metrics.successMetrics.averageTimeToPassage.toFixed(1)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bipartisan Analysis -->
            <div class="bill-card">
                <h3 class="title">Bipartisan Collaboration Analysis</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold mb-2">Bipartisan Metrics</h4>
                        <div class="space-y-1">
                            <p>Bipartisan Bills: ${metrics.bipartisanMetrics.totalBipartisanBills}</p>
                            <p>Bipartisan Percentage: ${metrics.bipartisanMetrics.bipartisanPercentage.toFixed(1)}%</p>
                            <p>Avg. Collaborators per Bill: ${metrics.bipartisanMetrics.averageCollaboratorsPerBill.toFixed(1)}</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Cross-Party Collaborations</h4>
                        <div class="space-y-1">
                            ${Object.entries(metrics.bipartisanMetrics.crossPartyCollaborations)
                                .map(([parties, count]) => 
                                    `<p>${parties}: ${count} bills</p>`
                                ).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Committee Activity -->
            <div class="bill-card">
                <h3 class="title">Committee Dynamics</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold mb-2">Most Active Committees</h4>
                        <div class="space-y-1">
                            ${Object.entries(metrics.committeeDynamics.mostActiveCommittees)
                                .sort(([, a], [, b]) => b - a)
                                .slice(0, 5)
                                .map(([committee, count]) => 
                                    `<p>${committee}: ${count} bills</p>`
                                ).join('')}
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Committee Timing</h4>
                        <p>Average Time in Committee: ${(metrics.committeeDynamics.averageTimeInCommittee / (1000 * 60 * 60 * 24)).toFixed(1)} days</p>
                    </div>
                </div>
            </div>

            <!-- Temporal Analysis -->
            <div class="bill-card">
                <h3 class="title">Temporal Patterns</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold mb-2">Monthly Activity</h4>
                        <div class="space-y-1">
                            ${Object.entries(metrics.temporalAnalysis.billsPerMonth)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([month, count]) => 
                                    `<p>${month}: ${count} bills</p>`
                                ).join('')}
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Seasonal Trends</h4>
                        <div class="space-y-1">
                            ${Object.entries(metrics.temporalAnalysis.seasonalTrends)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([month, count]) => 
                                    `<p>Month ${month}: ${count} bills</p>`
                                ).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Amendment Analysis -->
            <div class="bill-card">
                <h3 class="title">Amendment Analysis</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold mb-2">Amendment Statistics</h4>
                        <div class="space-y-1">
                            <p>Total Amendments: ${metrics.amendmentAnalysis.totalAmendments}</p>
                            <p>Successful Amendments: ${metrics.amendmentAnalysis.successfulAmendments}</p>
                            <p>Success Rate: ${((metrics.amendmentAnalysis.successfulAmendments / metrics.amendmentAnalysis.totalAmendments) * 100 || 0).toFixed(1)}%</p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Party-wise Amendments</h4>
                        <div class="space-y-1">
                            ${Object.entries(metrics.amendmentAnalysis.amendmentsByParty || {})
                                .map(([party, count]) => 
                                    `<p>${party}: ${count} amendments</p>`
                                ).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Most Active Legislators -->
            <div class="bill-card">
                <h3 class="title">Top Collaborations</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold mb-2">Most Frequent Collaborator Pairs</h4>
                        <div class="space-y-1">
                            ${Object.entries(metrics.legislatorActivity.mostFrequentCollaborators)
                                .slice(0, 5)
                                .map(([pair, count]) => 
                                    `<p>${pair.split('-').map(name => abbreviateTitle(name)).join(' & ')}: ${count} collaborations</p>`
                                ).join('')}
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold mb-2">Active Legislators</h4>
                        <p>Total Active Legislators: ${metrics.legislatorActivity.activeLegislators.size}</p>
                    </div>
                </div>
            </div>

            <!-- Word Cloud -->
            <div class="bill-card">
                <h3 class="title">Word Cloud</h3>
                <div id="wordCloud" class="h-64"></div>
            </div>
        </div>
    `;

    // Insert analytics HTML
    const resultsElement = document.getElementById('results');
    resultsElement.insertAdjacentHTML('beforebegin', analyticsHTML);

    // Generate word cloud
    const wordCloudElement = document.getElementById('wordCloud');
    const wordList = processWordCloud(metrics.wordFrequency);

    if (wordList.length > 0) {
        WordCloud(wordCloudElement, {
            list: wordList,
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
            shrinkToFit: true,
        });
    } else {
        wordCloudElement.innerHTML = "<p>No significant words found in bill digests.</p>";
    }
};

// API Functions
const fetchBillDetails = async (billName) => {
    // Check cache first
    if (billDetailsCache.has(billName)) {
        return billDetailsCache.get(billName);
    }

    try {
        const year = document.getElementById('yearInput').value;
        const response = await fetch(`http://localhost:3000/${year}/bills/${billName}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        
        // Store in cache
        billDetailsCache.set(billName, data);
        return data;
    } catch (error) {
        console.error('Error fetching bill details:', error);
        return null;
    }
};

const fetchBillActions = async (billName) => {
    // Check cache first
    if (billActionsCache.has(billName)) {
        return billActionsCache.get(billName);
    }

    try {
        const year = document.getElementById('yearInput').value;
        const response = await fetch(`http://localhost:3000/${year}/bills/${billName}/actions`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        
        // Store in cache
        billActionsCache.set(billName, data.items || []);
        return data.items || [];
    } catch (error) {
        console.error('Error fetching bill actions:', error);
        return [];
    }
};

const fetchBillsByLegislator = async (legislatorLink) => {
    try {
        const year = document.getElementById('yearInput').value;
        const userId = legislatorLink.split('/').pop();

        // Show loading indicator
        document.getElementById('loading').classList.remove('hidden');

        // Initial fetch to get bill names
        const types = ['authored', 'coauthored', 'sponsored', 'cosponsored'];
        const billsByType = await Promise.all(
            types.map(async (type) => {
                const response = await fetch(`http://localhost:3000/${year}/legislators/${userId}/bills/${type}`);
                if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
                const data = await response.json();
                return { type, bills: data.items || [] };
            })
        );

        // Flatten the bills array
        const simpleBills = billsByType.flatMap(({ type, bills }) => 
            bills.filter(bill => bill.billName.startsWith('SB') || bill.billName.startsWith('HB'))
                 .map(bill => ({ ...bill, type }))
        );

        // Calculate total number of bills
        const totalBills = simpleBills.length;
        let processedBills = 0;

        // Add to bills set and render immediately to show something to the user
        simpleBills.forEach(bill => bills.add(JSON.stringify(bill)));
        renderBills();

        // Load details in the background in smaller batches
        const loadDetailsInBackground = async () => {
            const batchSize = 5;
            const batches = [];
            for (let i = 0; i < simpleBills.length; i += batchSize) {
                batches.push(simpleBills.slice(i, i + batchSize));
            }
        
            for (const batch of batches) {
                const detailedBills = await Promise.all(
                    batch.map(async (bill) => {
                        const details = await fetchBillDetails(bill.billName);
                        return { ...bill, details };
                    })
                );
        
                detailedBills.forEach(bill => {
                    bills.delete(JSON.stringify({ ...bill, details: undefined }));
                    bills.add(JSON.stringify(bill));
                });
        
                processedBills += batch.length;
                updateLoadingProgress(processedBills, totalBills);
                renderBills();
        
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        
            // Only display analytics after all bills are loaded
            displayAnalytics();
            document.getElementById('loading').classList.add('hidden');
        };

        // Start background loading
        loadDetailsInBackground();

    } catch (error) {
        console.error('Error fetching bills:', error);
        document.getElementById('noResults').classList.remove('hidden');
        document.getElementById('loading').classList.add('hidden');
    }
};

// Rendering Functions
const renderAutocompleteDropdown = () => {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.innerHTML = suggestions.map((legislator) => `
        <li class="autocomplete-item" data-link="${legislator.link}">
            ${abbreviateTitle(legislator.fullName)}
        </li>
    `).join('');
    dropdown.style.display = suggestions.length > 0 ? 'block' : 'none';
};

const renderBills = () => {
    const results = document.getElementById('results');
    results.innerHTML = '';

    if (bills.size === 0) {
        document.getElementById('noResults').classList.remove('hidden');
        return;
    }

    const billArray = Array.from(bills)
        .map((bill) => JSON.parse(bill))
        .sort((a, b) => a.billName.localeCompare(b.billName, undefined, { numeric: true }));

    const renderBillType = (type, bills) => {
        if (!bills || bills.length === 0) return '';
        return `
            <div class="space-y-6">
                <h2 class="title capitalize">${type} Bills</h2>
                <div class="space-y-4">
                    ${bills.map((bill) => `
                        <div class="bill-card">
                            <details ${openBills[bill.billName] ? 'open' : ''}>
                                <summary onclick="handleBillClick('${bill.billName}', '${type}')">
                                    ${bill.billName} - ${bill.description}
                                </summary>
                                <div class="space-y-4">
                                    ${bill.details ? `
                                        <p><strong>Title:</strong> ${bill.details.title}</p>
                                        <p><strong>Description:</strong> ${bill.details.description}</p>
                                        ${bill.details.latestVersion ? `
                                            <details>
                                                <summary><strong>Digest</strong></summary>
                                                <p>${bill.details.latestVersion.digest}</p>
                                            </details>
                                        ` : ''}
                                        ${bill.details.authors && bill.details.authors.length > 0 ? `
                                            <div>
                                                <h3>Authors:</h3>
                                                <ul>
                                                    ${bill.details.authors.map((author) => `
                                                        <li>${abbreviateTitle(author.fullName)} (${author.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.coauthors && bill.details.coauthors.length > 0 ? `
                                            <div>
                                                <h3>Co-authors:</h3>
                                                <ul>
                                                    ${bill.details.coauthors.map((coauthor) => `
                                                        <li>${abbreviateTitle(coauthor.fullName)} (${coauthor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.sponsors && bill.details.sponsors.length > 0 ? `
                                            <div>
                                                <h3>Sponsors:</h3>
                                                <ul>
                                                    ${bill.details.sponsors.map((sponsor) => `
                                                        <li>${abbreviateTitle(sponsor.fullName)} (${sponsor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.cosponsors && bill.details.cosponsors.length > 0 ? `
                                            <div>
                                                <h3>Co-sponsors:</h3>
                                                <ul>
                                                    ${bill.details.cosponsors.map((cosponsor) => `
                                                        <li>${abbreviateTitle(cosponsor.fullName)} (${cosponsor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.actions && bill.actions.length > 0 ? `
                                            <div>
                                                <h3>Actions:</h3>
                                                <ul>
                                                    ${bill.actions.map((action) => `
                                                        <li><strong>${formatDateTime(action.date)}:</strong> ${action.description}</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                    ` : ''}
                                </div>
                            </details>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    results.innerHTML = `
        ${renderBillType('authored', billArray.filter((bill) => bill.type === 'authored'))}
        ${renderBillType('coauthored', billArray.filter((bill) => bill.type === 'coauthored'))}
        ${renderBillType('sponsored', billArray.filter((bill) => bill.type === 'sponsored'))}
        ${renderBillType('cosponsored', billArray.filter((bill) => bill.type === 'cosponsored'))}
    `;
};

// Modify handleBillClick to lazy load actions
const handleBillClick = async (billName, type) => {
    openBills[billName] = !openBills[billName];
  
    if (openBills[billName]) {
      const billString = Array.from(bills).find((b) => JSON.parse(b).billName === billName);
      if (billString) {
        const bill = JSON.parse(billString);
        if (!bill.actions) {
          // Only fetch actions when expanded
          const actions = await fetchBillActions(billName);
          
          bills.delete(billString);
          bills.add(JSON.stringify({ ...bill, actions }));
        }
      }
    }
  
    renderBills();
  };

// Event Listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    const lastTerm = searchTerm.split(',').pop().trim();

    if (lastTerm.length > 0) {
        const filteredLegislators = legislators.filter((legislator) =>
            abbreviateTitle(legislator.fullName).toLowerCase().includes(lastTerm.toLowerCase())
        );
       
        suggestions = filteredLegislators;
        renderAutocompleteDropdown();
    } else {
        suggestions = [];
        document.getElementById('autocompleteDropdown').style.display = 'none';
    }
});

document.getElementById('autocompleteDropdown').addEventListener('click', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        const link = e.target.getAttribute('data-link');
        const name = abbreviateTitle(e.target.textContent.trim());

        const terms = searchTerm.split(',');
        terms[terms.length - 1] = name;
        searchTerm = terms.join(', ');

        document.getElementById('searchInput').value = searchTerm;
        document.getElementById('autocompleteDropdown').style.display = 'none';
    }
});

document.getElementById('yearInput').addEventListener('change', async () => {
    clearCaches();
    clearResults();
});

const clearCaches = () => {
    billDetailsCache.clear();
    billActionsCache.clear();
    bills.clear();
    openBills = {};
};

const updateLoadingProgress = (current, total) => {
    const percentage = Math.round((current / total) * 100);
    document.getElementById('loadingProgress').textContent = percentage;
    document.getElementById('progressIndicator').style.width = `${percentage}%`;
};

document.getElementById('searchButton').addEventListener('click', async () => {
    const year = document.getElementById('yearInput').value;
    if (!year) {
        alert('Please enter a year');
        return;
    }

    clearResults();

    const names = searchTerm.split(',').map((name) => name.trim());
    const uniqueLegislators = names.map((name) =>
        legislators.find((l) =>
            abbreviateTitle(l.fullName).toLowerCase() === name.toLowerCase()
        )
    ).filter(Boolean);

    if (uniqueLegislators.length > 0) {
        loading = true;
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('noResults').classList.add('hidden');

        updateLoadingProgress(0, 1);

        // Remove the setTimeout and separate displayAnalytics call
        await Promise.all(uniqueLegislators.map((legislator) =>
            fetchBillsByLegislator(legislator.link)
        ));

        renderBills();
        // Analytics will be displayed by loadDetailsInBackground after all bills are loaded
    } else {
        document.getElementById('noResults').classList.remove('hidden');
    }
});

// Make handleBillClick available globally
window.handleBillClick = handleBillClick;