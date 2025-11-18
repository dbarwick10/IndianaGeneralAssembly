import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "./findMyLegislator.js";
import { baseUrl } from "./const.js";

// Global state
let legislators = [];
let bills = new Set();
let loading = false;
let searchTerm = '';
let suggestions = [];
let openBills = {};
let billStats = null;
const testing = true;

// Initialize the application 
window.onload = async () => {
    try {
        // Always fetch fresh data from API first
        const response = await fetch(`${baseUrl}/legislators`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            // Update the legislators array
            legislators = data.items;
            // console.log('Loaded legislators from API:', legislators.length);

            // console.log('Checking URL parameters after loading legislators');
            handleUrlParameters();
        } else {
            throw new Error('No legislators returned from API');
        }

        handleUrlParameters();
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
                    // console.log('Loaded legislators from localStorage:', legislators.length);
                }
            } catch (parseError) {
                console.error('Error parsing localStorage data:', parseError);
            }
        }
        
        // If we still have no legislators, show an error message
        if (!legislators || legislators.length === 0) {
            console.error('No legislators available from any source');
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

/**
 * Analyze bills data using the server API instead of client-side processing
 * This function replaces several client-side processing functions
 */
const analyzeBillData = async (bills, legislatorNames) => {
  try {
    // Show loading indicator if you have one
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.classList.remove('hidden');
    }
    
    // Convert bills from Set to Array
    const billsArray = Array.from(bills).map(bill => JSON.parse(bill));
    
    // Make API call to server for processing
    const response = await fetch(`${baseUrl}/api/analyze-bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bills: billsArray,
        legislatorNames: legislatorNames
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    
    // Hide loading indicator
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
    
    return data;
  } catch (error) {
    console.error("Error analyzing bill data:", error);
    
    // Hide loading indicator in case of error
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
    
    return {
      stats: {
        overall: { total: 0, passed: 0, laws: 0, passageRate: '0.0', lawRate: '0.0', timing: {} },
        authored: { total: 0, passed: 0, laws: 0, timing: {}, authors: { democrat: 0, republican: 0, total: 0 } },
        coauthored: { total: 0, passed: 0, laws: 0, timing: {}, coauthors: { democrat: 0, republican: 0, total: 0 } },
        sponsored: { total: 0, passed: 0, laws: 0, timing: {}, sponsors: { democrat: 0, republican: 0, total: 0 } },
        cosponsored: { total: 0, passed: 0, laws: 0, timing: {}, cosponsors: { democrat: 0, republican: 0, total: 0 } }
      },
      wordCloudData: []
    };
  }
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
        const response = await fetch(`${baseUrl}/${year}/legislators/${userId}/complete-bills?names=${encodeURIComponent(namesParam)}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        
        const data = await response.json();
        const completeBills = data.bills || [];
        billStats = data.stats || null;
        
        // Update the bills Set with complete data
        completeBills.forEach(bill => bills.add(JSON.stringify(bill)));
        
        await updateView();
        
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
const renderStatsView = async () => {
    const results = document.getElementById('results');
    
    // Get the legislator names from the search input
    const names = searchTerm.split(',').map((name) => name.trim());
    
    // Get analysis data from server
    const analysisData = await analyzeBillData(bills, names);
    
    // Store the stats for future use
    billStats = analysisData.stats;
    
    // Use server-provided stats
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
                <h3>Bill Topics - Became Law (${stats.overall.laws})</h3>
                <canvas id="wordCloudLawsCanvas" class="word-cloud-canvas"></canvas>
            </div>
            
            <div class="stat-card">
                <h3>Bill Topics - Did Not Become Law (${stats.overall.total - stats.overall.laws})</h3>
                <canvas id="wordCloudNonLawsCanvas" class="word-cloud-canvas"></canvas>
            </div>
            
        </div>
    `;

    // OLD WORDCLOUD <div class="stat-card">
            //     <h3>Bill Topics Word Cloud</h3>
            //     <canvas id="wordCloudCanvas" class="word-cloud-canvas"></canvas>
            // </div>

    // Initialize word clouds after the canvases are in the DOM
    const canvasLaws = document.getElementById('wordCloudLawsCanvas');
    const canvasNonLaws = document.getElementById('wordCloudNonLawsCanvas');
    
    const wordListLaws = analysisData.wordCloudLaws || [];
    const wordListNonLaws = analysisData.wordCloudNonLaws || [];
    
    // Configure word cloud settings
    const wordCloudConfig = {
        gridSize: 20,
        weightFactor: 1,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#4B5563',
        rotateRatio: 0.2,
        rotationSteps: 2,
        backgroundColor: 'transparent',
        drawOutOfBound: false,
        shrinkToFit: true,
        wait: 50,
        minSize: 10,
        minRotation: -Math.PI / 8,
        maxRotation: Math.PI / 8,
        shuffle: false,
        shape: 'square',
        clearCanvas: true,
        random: () => 0.5,
    };
    
    // Set canvas sizes and render both word clouds
    if (canvasLaws) {
        canvasLaws.width = canvasLaws.offsetWidth;
        canvasLaws.height = 400;
        WordCloud(canvasLaws, { list: wordListLaws, ...wordCloudConfig });
    }
    
    if (canvasNonLaws) {
        canvasNonLaws.width = canvasNonLaws.offsetWidth;
        canvasNonLaws.height = 400;
        WordCloud(canvasNonLaws, { list: wordListNonLaws, ...wordCloudConfig });
    }
    
    // OLD WORDCLOUD // Initialize word cloud after the canvas is in the DOM
    // const canvas = document.getElementById('wordCloudCanvas');
    // const wordList = analysisData.wordCloudData || []; // Use server-generated word cloud data

    // // Set canvas size
    // canvas.width = canvas.offsetWidth;
    // canvas.height = 400;

    // // Configure and render word cloud
    // WordCloud(canvas, {
    //     list: wordList,
    //     gridSize: 20, // Increased grid size for more spacing
    //     weightFactor: 1,
    //     fontFamily: 'Inter, system-ui, sans-serif',
    //     color: '#4B5563',
    //     rotateRatio: 0.2, // Reduced rotation ratio
    //     rotationSteps: 2,
    //     backgroundColor: 'transparent',
    //     drawOutOfBound: false,
    //     shrinkToFit: true,
    //     wait: 50, // Add small delay between words
    //     minSize: 10, // Set minimum font size
    //     minRotation: -Math.PI / 8, // Limit rotation range
    //     maxRotation: Math.PI / 8,
    //     shuffle: false, // Prevent shuffling
    //     shape: 'square', // More stable than default ellipse
    //     clearCanvas: true,
    //     random: () => 0.5, // Fixed random seed
    // });
};

const renderBills = async () => {
    // Dynamically load issues data
    let issuesData = { issues: [] };
    try {
        const response = await fetch('/issues/2025/bills/index.json');
        issuesData = await response.json();
    } catch (error) {
        console.error('Error loading issues data:', error);
    }

    const results = document.getElementById('results');
    results.innerHTML = '';

    if (bills.size === 0) {
        document.getElementById('noResults').classList.remove('hidden');
        return;
    }

    const parsedBills = Array.from(bills)
        .map(bill => JSON.parse(bill))
        .sort((a, b) => {
            const getPriority = (bill) => {
                if (bill.becomeLaw) return 1; 
                if (bill.passedChamber) return 2; 
                return 3; 
            };

            const priorityA = getPriority(a);
            const priorityB = getPriority(b);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            } else {
                return a.billName.localeCompare(b.billName, undefined, { numeric: true });
            }
        });
    
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
                <h2 class="title capitalize">${type === 'authored' ? 'Authored' : type === 'coauthored' ? 'Coauthored' : type === 'sponsored' ? 'Sponsored' : type === 'cosponsored' ? 'Cosponsored' : '' } Bills</h2>
                <div class="space-y-4">
                    ${bills.map((bill) => {
                        const timing = bill.timing || {};
                        
                        // Precise matching for bill issues
                        const matchingIssue = issuesData.issues.find(issue => {
                            // Normalize bill name and issue title
                            const normalizedBillName = bill.billName.replace(/\s+/g, '').toLowerCase();
                            const normalizedIssueTitle = issue.title.replace(/\s+/g, '').toLowerCase();
                            
                            // Check if bill name is exactly in the issue title
                            return normalizedIssueTitle.includes(normalizedBillName);
                        });

                        return `
                        <div class="bill-card">
                            <details ${openBills[bill.billName] ? 'open' : ''} data-bill-name="${bill.billName}" data-bill-type="${type}">
                                <summary>
                                    <div class="bill-header">
                                        <div class="bill-title">
                                            ${bill.billName} - ${bill.description}
                                            ${bill.passedChamber ? 
                                                `<span class="status-tag passed">Referred to the ${
                                                    bill.sentToChamber && bill.sentToChamber.description === 'Referred to the Senate' ? 'Senate' : 
                                                    bill.sentToChamber && bill.sentToChamber.description === 'Referred to the House' ? 'House' : 
                                                    'Unknown Chamber'
                                                }${
                                                    timing?.daysToPassChamber ? ` in ${timing.daysToPassChamber} days` : ''
                                                }</span>` : ''}
                                            ${bill.returnedWithAmendments ? 
                                                `<span class="status-tag returned">Returned ${
                                                    bill.returnedWithAmendments.description === 'Returned to the Senate with amendments' ? 'to Senate' :
                                                    bill.returnedWithAmendments.description === 'Returned to the House with amendments' ? 'to House' :
                                                    'Unknown Chamber'
                                                }${
                                                    timing?.daysToReturnWithAmendments ? ` in ${timing.daysToReturnWithAmendments} days` : ''
                                                }</span>` : ''}
                                            ${bill.becomeLaw ? 
                                                `<span class="status-tag law">Became Law${
                                                    timing?.daysToBecomeLaw ? ` in ${timing.daysToBecomeLaw} days` : ''
                                                }</span>` : ''}
                                            ${matchingIssue ? `
                                                <span class="issues-button-container">
                                                    <a href="/issues/2025/#${matchingIssue.id}" 
                                                       class="button small-button issues-button"
                                                       target="_blank"
                                                       data-bill-name="${bill.billName}">
                                                        Call Issue Avaialble
                                                    </a>
                                                </span>
                                            ` : ''}
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

    // Add event listeners for bill card toggling
    document.querySelectorAll('.bill-card details').forEach(details => {
        details.querySelector('summary').addEventListener('click', (event) => {
            // Only handle clicks that aren't on the issues button
            if (!event.target.closest('.issues-button')) {
                const billName = details.getAttribute('data-bill-name');
                const billType = details.getAttribute('data-bill-type');
                
                // Update open state
                if (billName) {
                    openBills[billName] = !openBills[billName];
                    console.log(`Bill ${billName} toggled: ${openBills[billName]}`);
                }
                
                // No need to re-render the entire bill list
                // Just let the details element toggle naturally
            }
        });
    });

    // Add event listeners for issues buttons
    document.querySelectorAll('.issues-button').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent triggering the summary/details toggle
            const billName = button.getAttribute('data-bill-name');
            console.log(`Issues button clicked for bill: ${billName}`);
            // The link will handle navigation
        });
    });
};

const updateView = async () => {
    const isStatsView = document.getElementById('viewToggle').checked;
    if (isStatsView) {
        await renderStatsView();
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

document.getElementById('viewToggle').addEventListener('change', async () => {
    if (bills.size > 0) {
        await updateView();
        
        // Update URL after view is updated
        updateUrlWithSearch(searchTerm, document.getElementById('yearInput').value, 
                           document.getElementById('viewToggle').checked ? 'stats' : 'bills');
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
    legislators.find((l) => {
        if (!l || !l.fullName) return false;
        
        // Remove prefixes for comparison
        const cleanedLegName = abbreviateTitle(l.fullName).toLowerCase().replace(/\b(sen\.|rep\.)\s+/g, '');
        const cleanedSearchName = name.toLowerCase().replace(/\b(sen\.|rep\.)\s+/g, '');
        
        return cleanedLegName === cleanedSearchName;
    })
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
        await updateView();
        
        // Update URL after view is updated
        updateUrlWithSearch(searchTerm, year, document.getElementById('viewToggle').checked ? 'stats' : 'bills');
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
    const issueLink = document.getElementById('issues');
    
    if (currentPath.includes('index.html')) {
        billTrackerLink.classList.add('active');
    } else if (currentPath.includes('budget.html')) {
        budgetLink.classList.add('active');
    } else if (currentPath.includes('issues.html')) {
        issueLink.classList.add('active');
    }

    const findBtn = document.getElementById('find-my-legislators-btn');
    if (findBtn) {
        findBtn.addEventListener('click', showLegislatorFinder);
    }
    
    const clearBtn = document.getElementById('clear-my-legislators-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearMyLegislators);
    }
    
    // Load saved legislators on page load
    loadMyLegislators();
});

// Make handleBillClick available globally
window.handleBillClick = (billName, type) => {
    // This function is kept for backward compatibility
    // But we're now handling clicks with event listeners instead
    console.log(`Legacy handleBillClick called for ${billName} (${type})`);
    
    // Still update the openBills state
    openBills[billName] = !openBills[billName];
    
    // No need to re-render the entire bill list since we're 
    // letting the HTML details element handle its own state
};

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

// Function to parse URL parameters
function getUrlParams() {
    const searchParams = new URLSearchParams(window.location.search);
    const params = {};
    
    // Check for legislators parameter (now supports multiple comma-separated values)
    if (searchParams.has('legislators')) {
        const encodedLegislators = searchParams.get('legislators');
        // Split by comma first, then decode each legislator name
        const legislatorList = encodedLegislators.split(',').map(name => {
            // Convert dashes back to spaces after decoding
            const decoded = decodeURIComponent(name);
            return decoded.replace(/-+/g, ' ');
        });
        
        params.legislators = legislatorList;
        console.log('Found legislators in URL:', legislatorList);
    }
    
    // Check for year parameter
    if (searchParams.has('year')) {
        params.year = searchParams.get('year');
        console.log('Found year in URL:', params.year);
    }
    
    // Check for view parameter (bills or stats)
    if (searchParams.has('view')) {
        params.view = searchParams.get('view');
        console.log('Found view in URL:', params.view);
    }
    
    return params;
}

// Function to update URL with current search parameters
function updateUrlWithSearch(legislatorNames, year, viewType) {
    const params = new URLSearchParams();
    
    if (legislatorNames && legislatorNames.length > 0) {
        // Split by comma to handle multiple legislators
        const nameList = legislatorNames.split(',').map(name => name.trim());
        
        // Process each legislator name
        const formattedNames = nameList.map(name => {
            // Remove "Sen." and "Rep." prefixes
            const cleanedName = name.replace(/\b(Sen\.|Rep\.)\s+/g, '');
            // Replace spaces with dashes
            return encodeURIComponent(cleanedName.replace(/\s+/g, '-'));
        });
        
        // Join with commas for the URL
        params.set('legislators', formattedNames.join(','));
    }
    
    if (year) {
        params.set('year', year);
    }
    
    if (viewType) {
        params.set('view', viewType === 'stats' ? 'stats' : 'bills');
    }
    
    // Update the URL without reloading the page
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
}

// Handle URL parameters and perform search if needed
function handleUrlParameters() {
    console.log('Handling URL parameters...');
    const params = getUrlParams();
    
    if (params.legislators && params.legislators.length > 0) {
        console.log('Processing legislators from URL:', params.legislators);
        
        // Process each legislator name to add correct prefix
        const displayNames = params.legislators.map(legislatorName => {
            // Find the matching legislator to determine the correct prefix
            const matchingLegislator = legislators.find(leg => {
                const cleanedLegName = leg.fullName.toLowerCase().replace(/\b(senator|rep\.|representative)\s+/g, '');
                const cleanedSearchName = legislatorName.toLowerCase();
                return cleanedLegName === cleanedSearchName;
            });
            
            // Add the appropriate prefix based on chamber if found
            if (matchingLegislator) {
                const prefix = matchingLegislator.chamber === 'S' ? 'Sen. ' : 'Rep. ';
                return prefix + legislatorName;
            }
            
            // If no match found, return the name as is
            return legislatorName;
        });
        
        // Join names with commas for the search input
        const fullSearchTerm = displayNames.join(', ');
        document.getElementById('searchInput').value = fullSearchTerm;
        searchTerm = fullSearchTerm;
        
        // Set the year if provided
        if (params.year) {
            document.getElementById('yearInput').value = params.year;
        } else {
            // Default to current year
            const currentYear = new Date().getFullYear();
            document.getElementById('yearInput').value = currentYear.toString();
        }
        
        // Set view type if provided
        if (params.view === 'stats') {
            document.getElementById('viewToggle').checked = true;
        } else {
            document.getElementById('viewToggle').checked = false;
        }
        
        // Trigger search after a short delay to ensure DOM is fully loaded
        console.log('Scheduling search from URL parameters...');
        setTimeout(() => {
            console.log('Executing search from URL parameters');
            const searchButton = document.getElementById('searchButton');
            if (searchButton) {
                searchButton.click();
            } else {
                console.error('Search button not found in DOM');
            }
        }, 500); // Slightly longer delay to ensure everything is ready
    } else {
        console.log('No legislators parameter found in URL');
    }
}

// Add this event listener to detect URL changes (browser back/forward)
window.addEventListener('popstate', function(event) {
    console.log('popstate event triggered - URL changed');
    // Clear any existing search results first
    clearResults();
    // Get parameters from the new URL and perform search
    handleUrlParameters();
});
