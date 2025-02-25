// Global state
let legislators = [];
let bills = new Set();
let loading = false;
let searchTerm = '';
let suggestions = [];
let openBills = {};
const billDetailsCache = new Map();
const billActionsCache = new Map();
const testing = true;
const url = testing ? 'http://localhost:3000' : 'https://indianageneralassembly-production.up.railway.app';

// Initialize the application 
window.onload = async () => {
    try {
        const response = await fetch(`${url}/legislators`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        legislators = data.items || [];
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

const getPartyBreakdown = (legislators) => {
    if (!legislators) return { total: 0, democrat: 0, republican: 0 };
    
    return legislators.reduce((acc, legislator) => {
        acc.total++;
        if (legislator.party?.toLowerCase().includes('democrat')) {
            acc.democrat++;
        } else if (legislator.party?.toLowerCase().includes('republican')) {
            acc.republican++;
        }
        return acc;
    }, { total: 0, democrat: 0, republican: 0 });
};


const formatPartyBreakdown = (breakdown) => {
    const partySummary = breakdown.democrat ? `${breakdown.democrat}D / ${breakdown.republican}R` : `${breakdown.republican}R`;
    return `${breakdown.total} Total (${partySummary})`;
};

const clearResults = () => {
    document.getElementById('results').innerHTML = '';
    document.getElementById('noResults').classList.add('hidden');
    bills = new Set();
    openBills = {};
};

const generateWordCloud = (bills) => {
    // Common stop words to filter out
    const stopWords = new Set([
        'a', 'act', 'an', 'and', 'amend', 'indiana', 'concerning', 'code' , 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
        'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
        'will', 'with', 'the', 'concerning', 'regarding', 'various', 'matters',
        'provides', 'requires', 'establishes', 'amends', 'repeals', 'relating', 'state',
        'county', 'prior', 'bill', 'bills', 'act', 'acts', 'law', 'laws', 'public', 'code',
        'amend', 'certain', 'make', 'makes', 'relating', 'relates', 'relating', 'relates',
        'town'
    ]);

    const text = bills
        .map(bill => `${bill.description || ''} ${bill.details?.title || ''}`)
        .join(' ')
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ')
        .replace(/\d+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const words = text.split(' ')
        .filter(word => word.length > 3 && !stopWords.has(word))
        .reduce((acc, word) => {
            acc[word] = (acc[word] || 0) + 1;
            return acc;
        }, {});

    return Object.entries(words)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100) 
        .map(([word, freq]) => [word, Math.sqrt(freq) * 50]);
};

const hasBillPassedChamber = (bill) => {
    if (!bill.actions) return false;
    return bill.actions.some(action => 
        action.description.toLowerCase().includes('referred to the')
    );
};

const hasBillBecomeLaw = (bill) => {
    if (!bill.actions) return false;
    return bill.actions.some(action => 
        action.description.toLowerCase().includes('public law')
    );
};

const calculateBillTiming = (actions) => {
    if (!actions || actions.length === 0) return null;

    const sortedActions = actions.sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstAction = new Date(sortedActions[0].date);
    
    let chamberPassage = null;
    let lawPassage = null;

    for (const action of sortedActions) {
        const actionDate = new Date(action.date);
        const description = action.description.toLowerCase();

        if (!chamberPassage && description.includes('referred to the')) {
            chamberPassage = actionDate;
        }

        if (!lawPassage && description.includes('public law')) {
            lawPassage = actionDate;
        }
    }

    return {
        daysToPassChamber: chamberPassage ? 
            Math.ceil((chamberPassage - firstAction) / (1000 * 60 * 60 * 24)) : null,
        daysToBecomeLaw: lawPassage ? 
            Math.ceil((lawPassage - firstAction) / (1000 * 60 * 60 * 24)) : null
    };
};

const calculateAverageTiming = (bills) => {
    const timings = bills.map(bill => calculateBillTiming(bill.actions))
                        .filter(timing => timing !== null);

    const chamberTimes = timings.map(t => t.daysToPassChamber).filter(days => days !== null);
    const lawTimes = timings.map(t => t.daysToBecomeLaw).filter(days => days !== null);

    return {
        averageDaysToPassChamber: chamberTimes.length > 0 ? 
            Math.round(chamberTimes.reduce((a, b) => a + b, 0) / chamberTimes.length) : null,
        averageDaysToBecomeLaw: lawTimes.length > 0 ? 
            Math.round(lawTimes.reduce((a, b) => a + b, 0) / lawTimes.length) : null
    };
};

const renderAutocompleteDropdown = () => {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.innerHTML = suggestions.map((legislator) => `
        <li class="autocomplete-item" data-link="${legislator.link}">
            ${abbreviateTitle(legislator.fullName)}
        </li>
    `).join('');
    dropdown.style.display = suggestions.length > 0 ? 'block' : 'none';
};

// API Functions
const fetchBillDetails = async (billName) => {
    if (billDetailsCache.has(billName)) {
        return billDetailsCache.get(billName);
    }
    try {
        const year = document.getElementById('yearInput').value;
        const response = await fetch(`${url}/${year}/bills/${billName}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        billDetailsCache.set(billName, data);
        return data;
    } catch (error) {
        console.error('Error fetching bill details:', error);
        return null;
    }
};

const fetchBillActions = async (billName) => {
    if (billActionsCache.has(billName)) {
        return billActionsCache.get(billName);
    }

    try {
        const year = document.getElementById('yearInput').value;
        const response = await fetch(`${url}/${year}/bills/${billName}/actions`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        const actions = data.items || [];
        billActionsCache.set(billName, actions);
        return actions;
    } catch (error) {
        console.error('Error fetching bill actions:', error);
        return [];
    }
};

const fetchBillsByLegislator = async (legislatorLink) => {
    try {
        const year = document.getElementById('yearInput').value;
        const userId = legislatorLink.split('/').pop();
        document.getElementById('loading').classList.remove('hidden');

        const types = ['authored', 'coauthored', 'sponsored', 'cosponsored'];
        const billsByType = await Promise.all(
            types.map(async (type) => {
                const response = await fetch(`${url}/${year}/legislators/${userId}/bills/${type}`);
                if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
                const data = await response.json();
                return { type, bills: data.items || [] };
            })
        );

        const simpleBills = billsByType.flatMap(({ type, bills }) => 
            bills.filter(bill => bill.billName.startsWith('SB') || bill.billName.startsWith('HB'))
                 .map(bill => ({ ...bill, type }))
        );

        const totalBills = simpleBills.length;
        let processedBills = 0;

        const initialBillsWithActions = await Promise.all(
            simpleBills.map(async (bill) => {
                const actions = await fetchBillActions(bill.billName);
                return { ...bill, actions };
            })
        );

        initialBillsWithActions.forEach(bill => bills.add(JSON.stringify(bill)));
        updateView();

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
                        const existingBill = Array.from(bills)
                            .find(b => JSON.parse(b).billName === bill.billName);
                        const actions = existingBill ? JSON.parse(existingBill).actions : [];
                        return { ...bill, details, actions };
                    })
                );
        
                detailedBills.forEach(bill => {
                    bills.delete(JSON.stringify({ ...bill, details: undefined }));
                    bills.add(JSON.stringify(bill));
                });
        
                processedBills += batch.length;
                updateLoadingProgress(processedBills, totalBills);
                updateView();
        
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        
            document.getElementById('loading').classList.add('hidden');
        };

        loadDetailsInBackground();

    } catch (error) {
        console.error('Error fetching bills:', error);
        document.getElementById('noResults').classList.remove('hidden');
        document.getElementById('loading').classList.add('hidden');
    }
};

// Stats Functions
const getAmendmentStats = (bills, legislatorNames) => {
    if (!Array.isArray(bills)) {
        console.error('Bills is not an array:', bills);
        return { total: 0, passed: 0, failed: 0, passRate: '0.0', failRate: '0.0' };
    }

    const amendmentResults = bills.reduce((acc, bill) => {
        const amendmentStats = analyzeAmendments(bill, legislatorNames);
        if (amendmentStats) {
            acc.passed += amendmentStats.passed;
            acc.failed += amendmentStats.failed;
        }
        return acc;
    }, { passed: 0, failed: 0 });

    const total = amendmentResults.passed + amendmentResults.failed;
    
    return {
        total,
        passed: amendmentResults.passed,
        failed: amendmentResults.failed,
        passRate: total > 0 ? (amendmentResults.passed / total * 100).toFixed(1) : '0.0',
        failRate: total > 0 ? (amendmentResults.failed / total * 100).toFixed(1) : '0.0'
    };
};

// Enhanced analyzeAmendments with more specific amendment detection
const analyzeAmendments = (bill, legislatorNames) => {
    if (!bill.actions || !Array.isArray(legislatorNames)) {
        return null;
    }

    // Clean up legislator names for matching
    const searchNames = legislatorNames.map(name => 
        name.replace(/^(Rep\.|Senator|Sen\.|Representative)\s+/, '')
            .toLowerCase()
            .trim()
    );

    // Find amendments related to the specified legislators
    const amendments = bill.actions.filter(action => {
        const desc = action.description.toLowerCase();
        const isAmendment = desc.includes('amendment');
        const hasRollCall = desc.includes('roll call');
        const hasLegislatorName = searchNames.some(name => desc.includes(name));
        
        return isAmendment && hasRollCall && hasLegislatorName;
    });

    // Count passed and failed amendments
    return amendments.reduce((acc, action) => {
        const desc = action.description.toLowerCase();
        if (desc.includes('prevailed') || desc.includes('passed')) {
            acc.passed++;
        } else if (desc.includes('failed') || desc.includes('defeated')) {
            acc.failed++;
        }
        return acc;
    }, { passed: 0, failed: 0 });
};

// Modify the calculateStats function to include amendment analysis
const calculateStats = (bills, legislatorNames) => {
    const parsedBills = Array.from(bills).map(bill => JSON.parse(bill));
    
    // Get legislator names from the search input
    const searchInput = document.getElementById('searchInput');
    const names = searchInput.value.split(',').map(name => name.trim());
    
    const totalBills = parsedBills.length;
    const passedBills = parsedBills.filter(bill => hasBillPassedChamber(bill));
    const publicLaws = parsedBills.filter(bill => hasBillBecomeLaw(bill));

    const timing = calculateAverageTiming(parsedBills);
    const amendments = getAmendmentStats(parsedBills, names);

    const getTypeBreakdown = (type) => {
        const typeBills = parsedBills.filter(bill => bill.type === type);
        const typeTimings = calculateAverageTiming(typeBills);
        const typeAmendments = getAmendmentStats(typeBills, names);
        
        return {
            total: typeBills.length,
            passed: typeBills.filter(bill => hasBillPassedChamber(bill)).length,
            laws: typeBills.filter(bill => hasBillBecomeLaw(bill)).length,
            avgDaysToPassChamber: typeTimings.averageDaysToPassChamber,
            avgDaysToBecomeLaw: typeTimings.averageDaysToBecomeLaw,
            amendments: typeAmendments,
            authors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.authors || [])),
            coauthors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.coauthors || [])),
            sponsors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.sponsors || [])),
            cosponsors: getPartyBreakdown(typeBills.flatMap(bill => bill.details?.cosponsors || []))
        };
    };

    return {
        overall: {
            total: totalBills,
            passed: passedBills.length,
            laws: publicLaws.length,
            passageRate: (passedBills.length / totalBills * 100).toFixed(1),
            lawRate: (publicLaws.length / totalBills * 100).toFixed(1),
            avgDaysToPassChamber: timing.averageDaysToPassChamber,
            avgDaysToBecomeLaw: timing.averageDaysToBecomeLaw,
            amendments
        },
        authored: getTypeBreakdown('authored'),
        coauthored: getTypeBreakdown('coauthored'),
        sponsored: getTypeBreakdown('sponsored'),
        cosponsored: getTypeBreakdown('cosponsored')
    };
};

// Render Functions
const renderStatsView = () => {
    const stats = calculateStats(bills);
    const results = document.getElementById('results');

    const renderPassageRates = (categoryStats) => {
        const chamberRate = categoryStats.total ? (categoryStats.passed / categoryStats.total * 100).toFixed(1) : '0.0';
        const lawRate = categoryStats.total ? (categoryStats.laws / categoryStats.total * 100).toFixed(1) : '0.0';
        
        return `
            <div class="stat-metric">
                <div class="stat-value">${chamberRate}%</div>
                <div class="stat-label">Chamber Passage Rate (${categoryStats.passed} bills)</div>
                <div class="percentage-bar">
                    <div class="percentage-fill" style="width: ${chamberRate}%"></div>
                </div>
                <div class="stat-sublabel">${
                    categoryStats.avgDaysToPassChamber ? 
                    `Average ${categoryStats.avgDaysToPassChamber} days to pass` : 
                    'No timing data'
                }</div>
            </div>
            <div class="stat-metric">
                <div class="stat-value">${lawRate}%</div>
                <div class="stat-label">Law Passage Rate (${categoryStats.laws} bills)</div>
                <div class="percentage-bar">
                    <div class="percentage-fill" style="width: ${lawRate}%"></div>
                </div>
                <div class="stat-sublabel">${
                    categoryStats.avgDaysToBecomeLaw ? 
                    `Average ${categoryStats.avgDaysToBecomeLaw} days to become law` : 
                    'No timing data'
                }</div>
            </div>`;
    };

    const renderAmendmentStats = (amendmentStats) => {
        if (!amendmentStats || (amendmentStats.passed === 0 && amendmentStats.failed === 0)) {
            return `
                <div class="stat-metric">
                    <div class="stat-value">0</div>
                    <div class="stat-label">No Amendments Found</div>
                </div>`;
        }
        
        return `
            <div class="stat-metric">
                <div class="stat-value">${amendmentStats.passRate}%</div>
                <div class="stat-label">Amendments Passed (${amendmentStats.passed} amendments)</div>
                <div class="percentage-bar">
                    <div class="percentage-fill" style="width: ${amendmentStats.passRate}%"></div>
                </div>
            </div>
            <div class="stat-metric">
                <div class="stat-value">${amendmentStats.failRate}%</div>
                <div class="stat-label">Amendments Failed (${amendmentStats.failed} amendments)</div>
                <div class="percentage-bar">
                    <div class="percentage-fill" style="width: ${amendmentStats.failRate}%"></div>
                </div>
            </div>`;
    };

    results.innerHTML = `
        <div class="stats-container">
            <div class="stat-card">
                <h3>Overall Bill Status</h3>
                <div class="stat-metric">
                    <div class="stat-value">${stats.overall.total}</div>
                    <div class="stat-label">Total Bills</div>
                </div>
                ${renderPassageRates(stats.overall)}
            </div>

            <div class="stat-card">
                <h3>Authored Bills (${stats.authored.total})</h3>
                ${renderPassageRates(stats.authored)}
                <div class="stat-metric">
                    <div class="stat-value">${stats.authored.authors.democrat}D / ${stats.authored.authors.republican}R</div>
                    <div class="stat-label">Author Party Distribution</div>
                </div>
            </div>

            <div class="stat-card">
                <h3>Coauthored Bills (${stats.coauthored.total})</h3>
                ${renderPassageRates(stats.coauthored)}
                <div class="stat-metric">
                    <div class="stat-value">${stats.coauthored.coauthors.democrat}D / ${stats.coauthored.coauthors.republican}R</div>
                    <div class="stat-label">Coauthor Party Distribution</div>
                </div>
            </div>

            <div class="stat-card">
                <h3>Sponsored Bills (${stats.sponsored.total})</h3>
                ${renderPassageRates(stats.sponsored)}
                <div class="stat-metric">
                    <div class="stat-value">${stats.sponsored.sponsors.democrat}D / ${stats.sponsored.sponsors.republican}R</div>
                    <div class="stat-label">Sponsor Party Distribution</div>
                </div>
            </div>

            <div class="stat-card">
                <h3>Cosponsored Bills (${stats.cosponsored.total})</h3>
                ${renderPassageRates(stats.cosponsored)}
                <div class="stat-metric">
                    <div class="stat-value">${stats.cosponsored.cosponsors.democrat}D / ${stats.cosponsored.cosponsors.republican}R</div>
                    <div class="stat-label">Cosponsor Party Distribution</div>
                </div>
            </div>

            <div class="stat-card">
                <h3>Party Collaboration</h3>
                ${(() => {
                    const totalDems = (stats.coauthored.coauthors.democrat || 0) + (stats.cosponsored.cosponsors.democrat || 0);
                    const totalReps = (stats.coauthored.coauthors.republican || 0) + (stats.cosponsored.cosponsors.republican || 0);
                    const total = totalDems + totalReps;
                    return `
                        <div class="stat-metric">
                            <div class="stat-value">${total ? ((totalDems / total) * 100).toFixed(1) : '0.0'}%</div>
                            <div class="stat-label">Democratic Support</div>
                            <div class="percentage-bar">
                                <div class="percentage-fill" style="width: ${total ? ((totalDems / total) * 100) : 0}%"></div>
                            </div>
                        </div>
                        <div class="stat-metric">
                            <div class="stat-value">${total ? ((totalReps / total) * 100).toFixed(1) : '0.0'}%</div>
                            <div class="stat-label">Republican Support</div>
                            <div class="percentage-bar">
                                <div class="percentage-fill" style="width: ${total ? ((totalReps / total) * 100) : 0}%"></div>
                            </div>
                        </div>
                    `;
                })()}
            </div>

            ${stats.overall.amendments.total > 0 ? `
                <div class="stat-card">
                    <h3>Amendment Status (${stats.overall.amendments.total})</h3>
                    ${renderAmendmentStats(stats.overall.amendments)}
                </div>
            ` : ''}

            <div class="stat-card">
                <h3>Bill Topics Word Cloud</h3>
                <canvas id="wordCloudCanvas" class="word-cloud-canvas"></canvas>
            </div>
        </div>
    `;

    // Initialize word cloud after the canvas is in the DOM
    const parsedBills = Array.from(bills).map(bill => JSON.parse(bill));
    const canvas = document.getElementById('wordCloudCanvas');
    const wordList = generateWordCloud(parsedBills);

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;

    // Configure and render word cloud
    WordCloud(canvas, {
        list: wordList,
        gridSize: 20, // Increased grid size for more spacing
        weightFactor: 1,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#4B5563',
        rotateRatio: 0.2, // Reduced rotation ratio
        rotationSteps: 2,
        backgroundColor: 'transparent',
        drawOutOfBound: false,
        shrinkToFit: true,
        wait: 50, // Add small delay between words
        minSize: 10, // Set minimum font size
        minRotation: -Math.PI / 8, // Limit rotation range
        maxRotation: Math.PI / 8,
        shuffle: false, // Prevent shuffling
        shape: 'square', // More stable than default ellipse
        clearCanvas: true,
        random: () => 0.5, // Fixed random seed
    });
};

const renderBills = () => {
    const results = document.getElementById('results');
    results.innerHTML = '';

    if (bills.size === 0) {
        document.getElementById('noResults').classList.remove('hidden');
        return;
    }

    const parsedBills = Array.from(bills)
        .map(bill => JSON.parse(bill))
        .sort((a, b) => a.billName.localeCompare(b.billName, undefined, { numeric: true }));
    
    const groupedBills = {
        authored: parsedBills.filter(bill => bill.type === 'authored'),
        coauthored: parsedBills.filter(bill => bill.type === 'coauthored'),
        sponsored: parsedBills.filter(bill => bill.type === 'sponsored'),
        cosponsored: parsedBills.filter(bill => bill.type === 'cosponsored')
    };

    const renderBillType = (type, bills) => {
        if (!bills || bills.length === 0) return '';

        return `
            <div class="space-y-6">
                <h2 class="title capitalize">${type} Bills</h2>
                <div class="space-y-4">
                    ${bills.map((bill) => {
                        const timing = calculateBillTiming(bill.actions);
                        return `
                        <div class="bill-card">
                            <details ${openBills[bill.billName] ? 'open' : ''}>
                                <summary onclick="handleBillClick('${bill.billName}', '${type}')">
                                    <div class="bill-header">
                                        <div class="bill-title">
                                            ${bill.billName} - ${bill.description}
                                            ${hasBillPassedChamber(bill) ? 
                                                `<span class="status-tag passed">Passed Chamber${
                                                    timing?.daysToPassChamber ? ` in ${timing.daysToPassChamber} days` : ''
                                                }</span>` : ''}
                                            ${hasBillBecomeLaw(bill) ? 
                                                `<span class="status-tag law">Became Law${
                                                    timing?.daysToBecomeLaw ? ` in ${timing.daysToBecomeLaw} days` : ''
                                                }</span>` : ''}
                                        </div>
                                        ${bill.details ? `
                                            <div class="bill-summary">
                                                ${bill.details.authors?.length ? `
                                                    <span class="summary-item">
                                                        Authors: ${formatPartyBreakdown(getPartyBreakdown(bill.details.authors))}
                                                    </span>
                                                ` : ''}
                                                ${bill.details.coauthors?.length ? `
                                                    <span class="summary-item">
                                                        Co-authors: ${formatPartyBreakdown(getPartyBreakdown(bill.details.coauthors))}
                                                    </span>
                                                ` : ''}
                                                ${bill.details.sponsors?.length ? `
                                                    <span class="summary-item">
                                                        Sponsors: ${formatPartyBreakdown(getPartyBreakdown(bill.details.sponsors))}
                                                    </span>
                                                ` : ''}
                                                ${bill.details.cosponsors?.length ? `
                                                    <span class="summary-item">
                                                        Co-sponsors: ${formatPartyBreakdown(getPartyBreakdown(bill.details.cosponsors))}
                                                    </span>
                                                ` : ''}
                                            </div>
                                        ` : ''}
                                    </div>
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
                                            <div class="legislator-section">
                                                <div class="legislator-header">
                                                    <h3>Authors</h3>
                                                    <span class="party-count">
                                                        ${formatPartyBreakdown(getPartyBreakdown(bill.details.authors))}
                                                    </span>
                                                </div>
                                                <ul>
                                                    ${bill.details.authors.map((author) => `
                                                        <li>${abbreviateTitle(author.fullName)} (${author.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.coauthors && bill.details.coauthors.length > 0 ? `
                                            <div class="legislator-section">
                                                <div class="legislator-header">
                                                    <h3>Co-authors</h3>
                                                    <span class="party-count">
                                                        ${formatPartyBreakdown(getPartyBreakdown(bill.details.coauthors))}
                                                    </span>
                                                </div>
                                                <ul>
                                                    ${bill.details.coauthors.map((coauthor) => `
                                                        <li>${abbreviateTitle(coauthor.fullName)} (${coauthor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.sponsors && bill.details.sponsors.length > 0 ? `
                                            <div class="legislator-section">
                                                <div class="legislator-header">
                                                    <h3>Sponsors</h3>
                                                    <span class="party-count">
                                                        ${formatPartyBreakdown(getPartyBreakdown(bill.details.sponsors))}
                                                    </span>
                                                </div>
                                                <ul>
                                                    ${bill.details.sponsors.map((sponsor) => `
                                                        <li>${abbreviateTitle(sponsor.fullName)} (${sponsor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.cosponsors && bill.details.cosponsors.length > 0 ? `
                                            <div class="legislator-section">
                                                <div class="legislator-header">
                                                    <h3>Co-sponsors</h3>
                                                    <span class="party-count">
                                                        ${formatPartyBreakdown(getPartyBreakdown(bill.details.cosponsors))}
                                                    </span>
                                                </div>
                                                <ul>
                                                    ${bill.details.cosponsors.map((cosponsor) => `
                                                        <li>${abbreviateTitle(cosponsor.fullName)} (${cosponsor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                    ` : ''}
                                    ${bill.actions && bill.actions.length > 0 ? `
                                        <div>
                                            <h3>Actions:</h3>
                                            <ul>
                                                ${bill.actions
                                                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                                                    .map((action) => `
                                                        <li><strong>${formatDateTime(action.date)}:</strong> ${action.description}</li>
                                                    `).join('')}
                                            </ul>
                                        </div>
                                    ` : ''}
                                </div>
                            </details>
                        </div>
                    `}).join('')}
                </div>
            </div>
        `;
    };

    results.innerHTML = `
        ${renderBillType('authored', groupedBills.authored)}
        ${renderBillType('coauthored', groupedBills.coauthored)}
        ${renderBillType('sponsored', groupedBills.sponsored)}
        ${renderBillType('cosponsored', groupedBills.cosponsored)}
    `;
};

const updateLoadingProgress = (current, total) => {
    const percentage = Math.round((current / total) * 100);
    document.getElementById('loadingProgress').textContent = percentage;
    document.getElementById('progressIndicator').style.width = `${percentage}%`;
};

const updateView = () => {
    const isStatsView = document.getElementById('viewToggle').checked;
    if (isStatsView) {
        renderStatsView();
    } else {
        renderBills();
    }
};

const clearCaches = () => {
    billDetailsCache.clear();
    billActionsCache.clear();
    bills.clear();
    openBills = {};
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

document.getElementById('viewToggle').addEventListener('change', () => {
    const label = document.getElementById('viewLabel');
    // label.textContent = document.getElementById('viewToggle').checked ? 'Stats View' : 'Bill View';
    
    if (bills.size > 0) {
        updateView();
    }
});

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

        await Promise.all(uniqueLegislators.map((legislator) =>
            fetchBillsByLegislator(legislator.link)
        ));

        updateView();
    } else {
        document.getElementById('noResults').classList.remove('hidden');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Highlight active nav link based on current page
    const currentPath = window.location.pathname;
    const billTrackerLink = document.getElementById('billTracker');
    const budgetLink = document.getElementById('budget');
    
    if (currentPath.includes('index.html')) {
        billTrackerLink.classList.add('active');
    } else if (currentPath.includes('budget.html')) {
        budgetLink.classList.add('active');
    }
});

// Make handleBillClick available globally
window.handleBillClick = (billName, type) => {
    openBills[billName] = !openBills[billName];
    renderBills();
};

// Create and inject the Find Legislator UI
const setupFindLegislatorUI = () => {
    // Create a toggle button for the finder
    const finderToggle = document.createElement('button');
    finderToggle.id = 'finderToggle';
    finderToggle.className = 'button secondary-button';
    finderToggle.textContent = 'Find My Legislators';
    
    // Add the toggle button to the search container
    const searchContainer = document.querySelector('.search-container');
    const viewToggle = document.querySelector('.view-toggle');
    
    if (searchContainer && viewToggle) {
        searchContainer.insertBefore(finderToggle, viewToggle);
    } else if (searchContainer) {
        searchContainer.appendChild(finderToggle);
    }
    
    // Create the finder form container
    const finderContainer = document.createElement('div');
    finderContainer.id = 'finderContainer';
    finderContainer.className = 'finder-container hidden';
    
    finderContainer.innerHTML = `
        <div class="finder-form">
            <h2>Find Your Legislators by Address</h2>
            <div class="form-group">
                <label for="street">Street Address</label>
                <input type="text" id="street" class="input" placeholder="123 Main St" required>
            </div>
            <div class="form-group">
                <label for="city">City</label>
                <input type="text" id="city" class="input" placeholder="Indianapolis" required>
            </div>
            <div class="form-group">
                <label for="zip">ZIP Code</label>
                <input type="text" id="zip" class="input" placeholder="46204" required>
            </div>
            <button id="findButton" class="button">Find My Legislators</button>
        </div>
        <div id="legislatorResults" class="legislator-results hidden"></div>
        <div id="finderLoading" class="loading hidden">Searching for your legislators...</div>
        <div id="finderError" class="error-message hidden"></div>
    `;
    
    // Add the finder container after the search container
    if (searchContainer) {
        searchContainer.parentNode.insertBefore(finderContainer, searchContainer.nextSibling);
    }
    
    // Toggle finder visibility when the button is clicked
    finderToggle.addEventListener('click', () => {
        finderContainer.classList.toggle('hidden');
        // Clear previous results when opening
        if (!finderContainer.classList.contains('hidden')) {
            document.getElementById('legislatorResults').classList.add('hidden');
            document.getElementById('finderError').classList.add('hidden');
            document.getElementById('legislatorResults').innerHTML = '';
        }
    });
    
    // Set up the find button functionality
    document.getElementById('findButton').addEventListener('click', handleFindLegislators);
};

const fetchLegislatorsByAddress = async (street, city, zip) => {
    try {
        const year = document.getElementById('yearInput').value || '2025';
        
        // URL encode the address components
        const encodedStreet = encodeURIComponent(street);
        const encodedCity = encodeURIComponent(city);
        const encodedZip = encodeURIComponent(zip || '');
        
        console.log(`Finding legislators for: ${street}, ${city}, ${zip || ''}`);
        const apiUrl = `${url}/${year}/address/legislators?street=${encodedStreet}&city=${encodedCity}&zip=${encodedZip}`;
        console.log(`API URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server error response: ${errorText}`);
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Legislators data received:', data);
        return data.items || [];
    } catch (error) {
        console.error('Error finding legislators by address:', error);
        throw error;
    }
};

// Handle the find legislators form submission
const handleFindLegislators = async () => {
    const street = document.getElementById('street').value.trim();
    const city = document.getElementById('city').value.trim();
    const zip = document.getElementById('zip').value.trim();
    
    const resultsContainer = document.getElementById('legislatorResults');
    const loadingElement = document.getElementById('finderLoading');
    const errorElement = document.getElementById('finderError');
    
    // Validate inputs - require street and city
    if (!street || !city) {
        errorElement.textContent = 'Please enter your street address and city.';
        errorElement.classList.remove('hidden');
        return;
    }
    
    // Show loading, hide results and errors
    loadingElement.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    errorElement.classList.add('hidden');
    
    try {
        const year = document.getElementById('yearInput').value || '2025';
        
        // URL encode the address components
        const encodedStreet = encodeURIComponent(street);
        const encodedCity = encodeURIComponent(city);
        const encodedZip = encodeURIComponent(zip || '');
        
        console.log(`Finding legislators for: ${street}, ${city}, ${zip || ''}`);
        const apiUrl = `${url}/${year}/address/legislators?street=${encodedStreet}&city=${encodedCity}&zip=${encodedZip}`;
        console.log(`API URL: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Server error response: ${errorText}`);
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('District data received:', data);
        
        // If we already have legislators in the data, display them
        if (data.items && data.items.length > 0) {
            displayLegislatorResults(data);
            return;
        }
        
        // If we have district info but no legislators, look them up from the main legislators list
        if (data.houseDistrict || data.senateDistrict) {
            // Use the legislators array already loaded in your app
            const matchingLegislators = [];
            
            // Find legislators matching these districts
            if (window.legislators && window.legislators.length > 0) {
                legislators.forEach(legislator => {
                    if ((data.houseDistrict && legislator.chamber === 'H' && legislator.district === data.houseDistrict) ||
                        (data.senateDistrict && legislator.chamber === 'S' && legislator.district === data.senateDistrict)) {
                        matchingLegislators.push(legislator);
                    }
                });
            }
            
            // Add found legislators to the data object
            data.items = matchingLegislators;
            
            // Display the enhanced data
            displayLegislatorResults(data);
            return;
        }
        
        // No district info found
        errorElement.textContent = 'No legislative districts found for this address. Please check your address and try again.';
        errorElement.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error finding legislators:', error);
        
        // Provide more specific error message based on the error
        if (error.message.includes('404')) {
            errorElement.textContent = 'We couldn\'t find legislative districts for this address. Please verify your address and try again.';
        } else if (error.message.includes('500')) {
            errorElement.textContent = 'Server error while looking up your legislators. Please try again later.';
        } else {
            errorElement.textContent = 'Unable to find legislators for this address. Please check your address and try again.';
        }
        
        errorElement.classList.remove('hidden');
    } finally {
        loadingElement.classList.add('hidden');
    }
};

// Display the found legislators
const displayLegislatorResults = (legislators, isFallback = false) => {
    const resultsContainer = document.getElementById('legislatorResults');
    resultsContainer.innerHTML = '';
    
    if (!legislators || legislators.length === 0) {
        resultsContainer.innerHTML = '<p>No legislators found for this address.</p>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
    // Create header for results
    const header = document.createElement('h3');
    header.textContent = 'Your Legislators';
    header.className = 'title';
    resultsContainer.appendChild(header);
    
    // Add note for fallback method
    if (isFallback) {
        const fallbackNote = document.createElement('div');
        fallbackNote.className = 'fallback-note';
        fallbackNote.innerHTML = `
            <p>We couldn't find your exact district, so we're showing legislators who may represent your area.
            For more accurate results, please try using a different address format.</p>
        `;
        resultsContainer.appendChild(fallbackNote);
    }
    
    // Create a list for the legislators
    const legislatorsList = document.createElement('div');
    legislatorsList.className = 'legislators-list';
    
    // Add each legislator to the list
    legislators.forEach(legislator => {
        const legislatorCard = document.createElement('div');
        legislatorCard.className = 'legislator-card';
        
        // Determine chamber for display
        const chamberDisplay = legislator.chamber === 'S' ? 'Senate' : 'House';
        
        legislatorCard.innerHTML = `
            <div class="legislator-info">
                <h4>${legislator.firstName} ${legislator.lastName}</h4>
                <p>${chamberDisplay} District ${legislator.district}</p>
                <p>Party: ${legislator.party}</p>
                <button class="button small-button select-legislator" 
                        data-link="${legislator.link}" 
                        data-name="${legislator.firstName} ${legislator.lastName}">
                    View Bills
                </button>
            </div>
        `;
        
        legislatorsList.appendChild(legislatorCard);
    });
    
    resultsContainer.appendChild(legislatorsList);
    resultsContainer.classList.remove('hidden');
    
    // Add event listeners to the "View Bills" buttons
    document.querySelectorAll('.select-legislator').forEach(button => {
        button.addEventListener('click', (event) => {
            const legislatorLink = event.currentTarget.getAttribute('data-link');
            const legislatorName = event.currentTarget.getAttribute('data-name');
            
            // Set the legislator in the search input and trigger search
            document.getElementById('searchInput').value = abbreviateTitle(legislatorName);
            document.getElementById('searchButton').click();
            
            // Hide the finder container
            document.getElementById('finderContainer').classList.add('hidden');
        });
    });
};

// Initialize the finder when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setupFindLegislatorUI();
});