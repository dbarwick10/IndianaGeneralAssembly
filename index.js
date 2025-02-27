// Global state
let legislators = [];
let bills = new Set();
let loading = false;
let searchTerm = '';
let suggestions = [];
let openBills = {};
let billStats = null;
const testing = false;
const url = testing ? 'http://localhost:3000' : 'https://indianageneralassembly-production.up.railway.app';

// Initialize the application 
window.onload = async () => {
    try {
        // Always fetch fresh data from API first
        const response = await fetch(`${url}/legislators`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            // Update the legislators array
            legislators = data.items;
            // console.log('Loaded legislators from API:', legislators.length);
        } else {
            throw new Error('No legislators returned from API');
        }
    } catch (error) {
        console.error('Error loading legislators from API:', error);
        console.log('Attempting to load from localStorage...');
        
        // Try to load from localStorage as fallback
        const storedLegislators = localStorage.getItem('legislators');
        
        if (storedLegislators) {
            try {
                const parsed = JSON.parse(storedLegislators);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    legislators = parsed;
                    console.log('Loaded legislators from localStorage:', legislators.length);
                }
            } catch (parseError) {
                console.error('Error parsing localStorage data:', parseError);
            }
        }
        
        // If we still have no legislators, show an error message
        if (!legislators || legislators.length === 0) {
            console.error('No legislators available from any source');
            // Instead of alert, you could show a message in the UI
            // alert('Failed to load legislators data. Please refresh the page or try again later.');
        }
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

const formatPartyBreakdown = (breakdown) => {
    const partySummary = breakdown.democrat ? `${breakdown.democrat}D / ${breakdown.republican}R` : `${breakdown.republican}R`;
    return `${breakdown.total} Total (${partySummary})`;
};

const clearResults = () => {
    document.getElementById('results').innerHTML = '';
    document.getElementById('noResults').classList.add('hidden');
    bills = new Set();
    openBills = {};
    billStats = null;
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
const fetchCompleteBillData = async (legislatorLink, legislatorNames) => {
    // console.log(`=== CLIENT: FETCHING COMPLETE BILL DATA ===`);
    // console.log(`Legislator link: ${legislatorLink}`);
    // console.log(`Legislator names: ${legislatorNames.join(', ')}`);

    try {
        const year = document.getElementById('yearInput').value;
        const userId = legislatorLink.split('/').pop();
        
        // Show loading spinner
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
        }
        
        // Format legislator names for amendment tracking
        const namesParam = legislatorNames.join(',');
        
        // Make a single API call to get complete bill data
        const response = await fetch(`${url}/${year}/legislators/${userId}/complete-bills?names=${encodeURIComponent(namesParam)}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        const completeBills = data.bills || [];
        billStats = data.stats || null;
        
        // Update the bills Set with complete data
        completeBills.forEach(bill => bills.add(JSON.stringify(bill)));
        
        updateView();
        
        // Hide spinner when done
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
        
        return completeBills;
    } catch (error) {
        console.error('Error fetching complete bill data:', error);
        
        // Show error and hide spinner
        const noResultsElement = document.getElementById('noResults');
        if (noResultsElement) {
            noResultsElement.classList.remove('hidden');
        }
        
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
        
        return [];
    }
};


// Render Functions
const renderStatsView = () => {
    const results = document.getElementById('results');
    
    // Use server-provided stats if available, otherwise use empty default values
    const stats = billStats || {
        overall: { total: 0, passed: 0, laws: 0, passageRate: '0.0', lawRate: '0.0', timing: {} },
        authored: { total: 0, passed: 0, laws: 0, timing: {}, authors: { democrat: 0, republican: 0, total: 0 } },
        coauthored: { total: 0, passed: 0, laws: 0, timing: {}, coauthors: { democrat: 0, republican: 0, total: 0 } },
        sponsored: { total: 0, passed: 0, laws: 0, timing: {}, sponsors: { democrat: 0, republican: 0, total: 0 } },
        cosponsored: { total: 0, passed: 0, laws: 0, timing: {}, cosponsors: { democrat: 0, republican: 0, total: 0 } }
    };

    const renderPassageRates = (categoryStats) => {
        const chamberRate = categoryStats.passageRate || '0.0';
        const lawRate = categoryStats.lawRate || '0.0';
        
        return `
            <div class="stat-metric">
                <div class="stat-value">${chamberRate}%</div>
                <div class="stat-label">Chamber Passage Rate (${categoryStats.passed} bills)</div>
                <div class="percentage-bar">
                    <div class="percentage-fill" style="width: ${chamberRate}%"></div>
                </div>
                <div class="stat-sublabel">${
                    categoryStats.timing?.averageDaysToPassChamber ? 
                    `Average ${categoryStats.timing.averageDaysToPassChamber} days to pass` : 
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
                    categoryStats.timing?.averageDaysToBecomeLaw ? 
                    `Average ${categoryStats.timing.averageDaysToBecomeLaw} days to become law` : 
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
                    <div class="stat-value">${stats.authored.authors?.democrat || 0}D / ${stats.authored.authors?.republican || 0}R</div>
                    <div class="stat-label">Author Party Distribution</div>
                </div>
            </div>

            <div class="stat-card">
                <h3>Coauthored Bills (${stats.coauthored.total})</h3>
                ${renderPassageRates(stats.coauthored)}
                <div class="stat-metric">
                    <div class="stat-value">${stats.coauthored.coauthors?.democrat || 0}D / ${stats.coauthored.coauthors?.republican || 0}R</div>
                    <div class="stat-label">Coauthor Party Distribution</div>
                </div>
            </div>

            <div class="stat-card">
                <h3>Sponsored Bills (${stats.sponsored.total})</h3>
                ${renderPassageRates(stats.sponsored)}
                <div class="stat-metric">
                    <div class="stat-value">${stats.sponsored.sponsors?.democrat || 0}D / ${stats.sponsored.sponsors?.republican || 0}R</div>
                    <div class="stat-label">Sponsor Party Distribution</div>
                </div>
            </div>

            <div class="stat-card">
                <h3>Cosponsored Bills (${stats.cosponsored.total})</h3>
                ${renderPassageRates(stats.cosponsored)}
                <div class="stat-metric">
                    <div class="stat-value">${stats.cosponsored.cosponsors?.democrat || 0}D / ${stats.cosponsored.cosponsors?.republican || 0}R</div>
                    <div class="stat-label">Cosponsor Party Distribution</div>
                </div>
            </div>

            <div class="stat-card">
                <h3>Party Collaboration</h3>
                ${(() => {
                    const totalDems = (stats.coauthored.coauthors?.democrat || 0) + (stats.cosponsored.cosponsors?.democrat || 0);
                    const totalReps = (stats.coauthored.coauthors?.republican || 0) + (stats.cosponsored.cosponsors?.republican || 0);
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

            ${stats.overall.amendments?.total > 0 ? `
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
                        const timing = bill.timing || {};
                        return `
                        <div class="bill-card">
                            <details ${openBills[bill.billName] ? 'open' : ''}>
                                <summary onclick="handleBillClick('${bill.billName}', '${type}')">
                                    <div class="bill-header">
                                        <div class="bill-title">
                                            ${bill.billName} - ${bill.description}
                                            ${bill.passedChamber ? 
                                                `<span class="status-tag passed">Passed Chamber${
                                                    timing?.daysToPassChamber ? ` in ${timing.daysToPassChamber} days` : ''
                                                }</span>` : ''}
                                            ${bill.becomeLaw ? 
                                                `<span class="status-tag law">Became Law${
                                                    timing?.daysToBecomeLaw ? ` in ${timing.daysToBecomeLaw} days` : ''
                                                }</span>` : ''}
                                        </div>
                                        ${bill.details ? `
                                            <div class="bill-summary">
                                                ${bill.details.authors?.length ? `
                                                    <span class="summary-item">
                                                        Authors: ${formatPartyBreakdown(bill.details.authorParties || {
                                                            democrat: bill.details.authors.filter(a => a.party?.toLowerCase().includes('democrat')).length,
                                                            republican: bill.details.authors.filter(a => a.party?.toLowerCase().includes('republican')).length,
                                                            total: bill.details.authors.length
                                                        })}
                                                    </span>
                                                ` : ''}
                                                ${bill.details.coauthors?.length ? `
                                                    <span class="summary-item">
                                                        Co-authors: ${formatPartyBreakdown(bill.details.coauthorParties || {
                                                            democrat: bill.details.coauthors.filter(a => a.party?.toLowerCase().includes('democrat')).length,
                                                            republican: bill.details.coauthors.filter(a => a.party?.toLowerCase().includes('republican')).length,
                                                            total: bill.details.coauthors.length
                                                        })}
                                                    </span>
                                                ` : ''}
                                                ${bill.details.sponsors?.length ? `
                                                    <span class="summary-item">
                                                        Sponsors: ${formatPartyBreakdown(bill.details.sponsorParties || {
                                                            democrat: bill.details.sponsors.filter(a => a.party?.toLowerCase().includes('democrat')).length,
                                                            republican: bill.details.sponsors.filter(a => a.party?.toLowerCase().includes('republican')).length,
                                                            total: bill.details.sponsors.length
                                                        })}
                                                    </span>
                                                ` : ''}
                                                ${bill.details.cosponsors?.length ? `
                                                    <span class="summary-item">
                                                        Co-sponsors: ${formatPartyBreakdown(bill.details.cosponsorParties || {
                                                            democrat: bill.details.cosponsors.filter(a => a.party?.toLowerCase().includes('democrat')).length,
                                                            republican: bill.details.cosponsors.filter(a => a.party?.toLowerCase().includes('republican')).length,
                                                            total: bill.details.cosponsors.length
                                                        })}
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
                                                        ${formatPartyBreakdown(bill.details.authorParties || {
                                                            democrat: bill.details.authors.filter(a => a.party?.toLowerCase().includes('democrat')).length,
                                                            republican: bill.details.authors.filter(a => a.party?.toLowerCase().includes('republican')).length,
                                                            total: bill.details.authors.length
                                                        })}
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
                                                        ${formatPartyBreakdown(bill.details.coauthorParties || {
                                                            democrat: bill.details.coauthors.filter(a => a.party?.toLowerCase().includes('democrat')).length,
                                                            republican: bill.details.coauthors.filter(a => a.party?.toLowerCase().includes('republican')).length,
                                                            total: bill.details.coauthors.length
                                                        })}
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
                                                        ${formatPartyBreakdown(bill.details.sponsorParties || {
                                                            democrat: bill.details.sponsors.filter(a => a.party?.toLowerCase().includes('democrat')).length,
                                                            republican: bill.details.sponsors.filter(a => a.party?.toLowerCase().includes('republican')).length,
                                                            total: bill.details.sponsors.length
                                                        })}
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
                                                        ${formatPartyBreakdown(bill.details.cosponsorParties || {
                                                            democrat: bill.details.cosponsors.filter(a => a.party?.toLowerCase().includes('democrat')).length,
                                                            republican: bill.details.cosponsors.filter(a => a.party?.toLowerCase().includes('republican')).length,
                                                            total: bill.details.cosponsors.length
                                                        })}
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
    try {
        const percentage = Math.round((current / total) * 100);
        
        const progressTextElement = document.getElementById('loadingProgress');
        if (progressTextElement) {
            progressTextElement.textContent = percentage;
        }
        
        const progressBarElement = document.getElementById('progressIndicator');
        if (progressBarElement) {
            progressBarElement.style.width = `${percentage}%`;
        }
    } catch (error) {
        // Silently handle any errors with the progress bar
        console.warn('Error updating progress:', error);
    }
};

const updateView = () => {
    const isStatsView = document.getElementById('viewToggle').checked;
    if (isStatsView) {
        renderStatsView();
    } else {
        renderBills();
    }
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
    clearResults();
});

document.getElementById('viewToggle').addEventListener('change', () => {
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
            l && l.fullName && abbreviateTitle(l.fullName).toLowerCase() === name.toLowerCase()
        )
    ).filter(Boolean);

    if (uniqueLegislators.length > 0) {
        loading = true;
        
        // Hide no results, we're about to search
        const noResultsElement = document.getElementById('noResults');
        if (noResultsElement) {
            noResultsElement.classList.add('hidden');
        }

        // Save each legislator to recent searches
        uniqueLegislators.forEach(legislator => saveRecentSearch(legislator));

        // Fetch data for all selected legislators
        await Promise.all(uniqueLegislators.map((legislator) =>
            fetchCompleteBillData(legislator.link, names)
        ));

        loading = false;
        updateView();
    } else {
        const noResultsElement = document.getElementById('noResults');
        if (noResultsElement) {
            noResultsElement.classList.remove('hidden');
        }
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
        
        // console.log(`Finding legislators for: ${street}, ${city}, ${zip || ''}`);
        const apiUrl = `${url}/${year}/address/legislators?street=${encodedStreet}&city=${encodedCity}&zip=${encodedZip}`;
        // console.log(`API URL: ${apiUrl}`);
        
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
        // console.log('District data received:', data);
        
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
const displayLegislatorResults = (response, isFallback = false) => {
    const resultsContainer = document.getElementById('legislatorResults');
    resultsContainer.innerHTML = '';
    
    // Check if we were passed a response object or an array of legislators
    const foundLegislators = Array.isArray(response) ? response : (response.items || []);
    
    if (!foundLegislators || foundLegislators.length === 0) {
        resultsContainer.innerHTML = '<p>No legislators found for this address.</p>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
    // Create header for results
    const header = document.createElement('h3');
    header.textContent = 'Your Legislators';
    header.className = 'title';
    resultsContainer.appendChild(header);
    
    // Add district information if available in the response
    if (response.houseDistrict || response.senateDistrict) {
        const districtInfo = document.createElement('div');
        districtInfo.className = 'district-info';
        districtInfo.innerHTML = `
            <p>Your address is in the following districts:</p>
            <ul>
                ${response.houseDistrict ? `<li>House District ${response.houseDistrict}</li>` : ''}
                ${response.senateDistrict ? `<li>Senate District ${response.senateDistrict}</li>` : ''}
            </ul>
        `;
        resultsContainer.appendChild(districtInfo);
    }
    
    // Add note for fallback method
    if (isFallback || response.source === 'zipcode-fallback') {
        const fallbackNote = document.createElement('div');
        fallbackNote.className = 'fallback-note';
        fallbackNote.innerHTML = `
            <p>We've matched your ZIP code (${document.getElementById('zip').value.trim()}) to likely legislative districts.
            This is an approximate match - your exact address might be in a different district.</p>
        `;
        resultsContainer.appendChild(fallbackNote);
    }
    
    // Create a list for the legislators
    const legislatorsList = document.createElement('div');
    legislatorsList.className = 'legislators-list';
    
    // Add each legislator to the list
    foundLegislators.forEach(legislator => {
        const legislatorCard = document.createElement('div');
        legislatorCard.className = 'legislator-card';
        
        // Determine chamber for display
        const chamberDisplay = legislator.chamber === 'S' ? 'Senate' : 'House';
        const chamberClass = legislator.chamber === 'S' ? 'Sen.' : 'Rep.';
        
        legislatorCard.innerHTML = `
            <div class="legislator-info">
                <h4>${chamberClass} ${legislator.firstName} ${legislator.lastName}</h4>
                <p>${chamberDisplay} District ${legislator.district}</p>
                <p>Party: ${legislator.party}</p>
                <button class="button small-button select-legislator" 
                        data-link="${legislator.link}" 
                        data-name="${chamberClass} ${legislator.firstName} ${legislator.lastName}">
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
            
            // Set the legislator in the search input
            const nameValue = abbreviateTitle(legislatorName);
            document.getElementById('searchInput').value = nameValue;
            
            // Update the searchTerm variable to match the input value
            searchTerm = nameValue;
            
            // Set the year to the current year using Date object
            const currentYear = new Date().getFullYear();
            document.getElementById('yearInput').value = currentYear.toString();
            
            // Trigger search
            document.getElementById('searchButton').click();
            
            // Hide the finder container
            document.getElementById('finderContainer').classList.add('hidden');
        });
    });
};

// Save legislators to local storage
function saveLegislatorsToLocalStorage(legislators) {
    if (!Array.isArray(legislators) || legislators.length === 0) return;
    
    try {
        localStorage.setItem('legislators', JSON.stringify(legislators));
        console.log('Saved legislators to localStorage:', legislators.length);
    } catch (error) {
        console.error('Error saving legislators to localStorage:', error);
    }
}

// Store recent legislator searches in localStorage
function saveRecentSearch(legislator) {
    try {
        // Get current recent searches
        let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        
        // Check if this legislator is already in the list
        const existingIndex = recentSearches.findIndex(item => item.link === legislator.link);
        
        if (existingIndex >= 0) {
            // Move to top of list if already exists
            const existing = recentSearches.splice(existingIndex, 1)[0];
            recentSearches.unshift(existing);
        } else {
            // Add to beginning of list
            recentSearches.unshift(legislator);
        }
        
        // Keep only the most recent 10 searches
        recentSearches = recentSearches.slice(0, 10);
        
        // Save back to localStorage
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
        
        // console.log('Saved recent search:', legislator.fullName);
    } catch (error) {
        console.error('Error saving recent search:', error);
    }
}

function setupRecentSearchesUI() {
    const searchContainer = document.querySelector('.search-container');
    
    // Create recent searches dropdown
    const recentContainer = document.createElement('div');
    recentContainer.className = 'recent-searches-container';
    recentContainer.innerHTML = `
        <div class="recent-searches-dropdown">
            <button id="recentSearchesButton" class="button secondary-button">Recent Searches</button>
            <div id="recentSearchesList" class="recent-searches-list hidden"></div>
        </div>
    `;
    
    // Add to the DOM
    if (searchContainer) {
        const searchInput = document.getElementById('searchInput');
        searchContainer.insertBefore(recentContainer, searchInput.nextSibling);
    }
    
    // Toggle dropdown visibility
    document.getElementById('recentSearchesButton').addEventListener('click', () => {
        const list = document.getElementById('recentSearchesList');
        list.classList.toggle('hidden');
        
        if (!list.classList.contains('hidden')) {
            updateRecentSearchesList();
        }
    });
}

function updateRecentSearchesList() {
    const list = document.getElementById('recentSearchesList');
    
    try {
        const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        
        if (recentSearches.length === 0) {
            list.innerHTML = '<div class="recent-search-item no-results">No recent searches</div>';
            return;
        }
        
        list.innerHTML = recentSearches.map(legislator => `
            <div class="recent-search-item" data-link="${legislator.link}" data-name="${legislator.fullName}">
                <span>${abbreviateTitle(legislator.fullName)}</span>
                <span class="recent-search-meta">${legislator.chamber === 'S' ? 'Senate' : 'House'} Dist. ${legislator.district}</span>
            </div>
        `).join('');
        
        // Add click handlers
        list.querySelectorAll('.recent-search-item').forEach(item => {
            item.addEventListener('click', event => {
                const link = event.currentTarget.getAttribute('data-link');
                const name = event.currentTarget.getAttribute('data-name');
                
                if (link && name) {
                    // Set the name in the search input
                    const nameValue = abbreviateTitle(name);
                    document.getElementById('searchInput').value = nameValue;
                    
                    // Update searchTerm variable
                    searchTerm = nameValue;
                    
                    // Set year to current year
                    const currentYear = new Date().getFullYear();
                    document.getElementById('yearInput').value = currentYear.toString();
                    
                    // Hide the dropdown
                    list.classList.add('hidden');
                    
                    // Trigger search
                    document.getElementById('searchButton').click();
                }
            });
        });
    } catch (error) {
        console.error('Error updating recent searches list:', error);
        list.innerHTML = '<div class="recent-search-item error">Error loading recent searches</div>';
    }
}

// Initialize the finder when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setupFindLegislatorUI();
});