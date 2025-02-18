// Global state
let legislators = [];
let bills = new Set();
let loading = false;
let searchTerm = '';
let suggestions = [];
let openBills = {};
let allBills = new Set();
const billDetailsCache = new Map();
const billActionsCache = new Map();

// Initialize the application
window.onload = async () => {
    try {
        // Fetch legislators from the backend
        const response = await fetch(`http://localhost:3000/legislators`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        legislators = data.items || []; // Ensure the response has an `items` array

        const defaultYear = document.getElementById('yearInput').value;
        await fetchAllBillsForYear(defaultYear);
        console.log('Preloaded bills for year:', defaultYear); // Debugging
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

    // Optionally, clear the analytics if displayed
    const analyticsElement = document.querySelector('.bill-card h2.title');
    if (analyticsElement && analyticsElement.textContent === 'Legislative Analytics') {
        analyticsElement.parentElement.remove();
    }
};

// Analytics Functions
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

// Fetch all bills for the specified year
const fetchAllBillsForYear = async (year) => {
    console.log('fetchAllBillsForYear called with year:', year); // Debugging
    try {
        const billsUrl = `http://localhost:3000/${year}/bills`;
        // console.log('Fetching bills from:', billsUrl); // Debugging
        const response = await fetch(billsUrl);
        // console.log('Response status:', response.status); // Debugging
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        // console.log('Initial bills response:', data); // Debugging

        // Extract bill names from the items array
        let billNames = data.items.map(item => {
            if (typeof item === 'string') {
                return item; // If items are strings, use them directly
            } else if (item.billName) {
                return item.billName; // If items are objects, extract billName
            } else {
                throw new Error('Invalid item format in API response');
            }
        });

        // Filter to only include SB and HB bills
        billNames = billNames.filter(billName => 
            billName.startsWith('SB') || billName.startsWith('HB')
        );

        // console.log('Bill names:', billNames); // Debugging

        // Fetch details for each bill
        const detailedBills = await Promise.all(
            billNames.map(async (billName) => {
                const billUrl = `http://localhost:3000/${year}/bills/${billName}`;
                // console.log(`Fetching details for bill ${billName} from ${billUrl}`); // Debugging
                const billResponse = await fetch(billUrl);
                if (!billResponse.ok) throw new Error(`Error fetching ${billName}: ${billResponse.status}`);
                const billDetails = await billResponse.json();
                return { ...billDetails, billName };
            })
        );

        allBills = new Set(detailedBills.map(bill => JSON.stringify(bill)));
        // console.log('All Bills Set:', allBills); // Debugging
        return detailedBills;
    } catch (error) {
        console.error('Error in fetchAllBillsForYear:', error);
        throw error;
    }
};

const getLegislatorMetrics = (billsSet) => {
    const metrics = {
        totalBills: 0,
        billsByChamberAndParty: {
            senate: { republican: 0, democrat: 0 },
            house: { republican: 0, democrat: 0 },
        },
        billsByType: {
            authored: 0,
            coauthored: 0,
            sponsored: 0,
            cosponsored: 0,
        },
        bipartisanBills: 0,
        partyCollaboration: {},
        activeLegislators: new Set(),
        mostActiveAuthors: [],
        successRate: {
            total: 0,
            passed: 0,
            byParty: {},
        },
        wordFrequency: {},
    };

    const billsArray = Array.from(billsSet).map(bill => JSON.parse(bill));

    billsArray.forEach(bill => {
        metrics.totalBills++;

        // Determine chamber (Senate or House) based on bill name
        const chamber = bill.billName.toLowerCase().startsWith('s') ? 'senate' : 'house';

        // Determine party based on the primary author
        let party = null;
        if (bill.authors?.length > 0) {
            const primaryAuthor = bill.authors[0];
            party = primaryAuthor.party.toLowerCase().includes('republican') ? 'republican' : 'democrat';
        }

        // Track bills by chamber and party
        if (party) {
            metrics.billsByChamberAndParty[chamber][party]++;
        }

        // Track bills by type (if applicable)
        if (bill.type) {
            metrics.billsByType[bill.type]++;
        }

        // Track all participants (authors, coauthors, sponsors, cosponsors)
        const allParticipants = [
            ...(bill.authors || []),
            ...(bill.coauthors || []),
            ...(bill.sponsors || []),
            ...(bill.cosponsors || []),
        ];

        // Add all participants to active legislators
        allParticipants.forEach(legislator => {
            if (legislator.fullName) {
                metrics.activeLegislators.add(legislator.fullName);
            }
        });

        // Check for bipartisan collaboration
        const parties = new Set(allParticipants.map(l => l.party).filter(Boolean));
        if (parties.size > 1) {
            metrics.bipartisanBills++;

            // Track party collaborations
            const partyArray = Array.from(parties);
            for (let i = 0; i < partyArray.length; i++) {
                for (let j = i + 1; j < partyArray.length; j++) {
                    const collaborationKey = [partyArray[i], partyArray[j]].sort().join('-');
                    metrics.partyCollaboration[collaborationKey] =
                        (metrics.partyCollaboration[collaborationKey] || 0) + 1;
                }
            }
        }

        // Track bill success
        const actions = bill.actions || []; // Ensure actions is always an array
        if (actions.length > 0) {
            const passed = actions.some(action =>
                action.description.toLowerCase().includes('public law')
            );
            if (passed) {
                metrics.successRate.passed++;
            }
        }

        // Extract words from digest
        if (bill.latestVersion?.digest) {
            const words = bill.latestVersion.digest
                .toLowerCase()
                .match(/\b\w+\b/g) || [];
            words.forEach(word => {
                if (word.length > 3) { // Ignore short words
                    metrics.wordFrequency[word] = (metrics.wordFrequency[word] || 0) + 1;
                }
            });
        }
    });

    // Calculate most active authors
    const authorCount = {};
    billsArray.forEach(bill => {
        if (bill.authors) {
            bill.authors.forEach(author => {
                authorCount[author.fullName] = (authorCount[author.fullName] || 0) + 1;
            });
        }
    });

    metrics.mostActiveAuthors = Object.entries(authorCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    // Calculate success rate by party
    billsArray.forEach(bill => {
        if (bill.authors) {
            bill.authors.forEach(author => {
                if (author.party) {
                    const party = author.party.toLowerCase().includes('republican') ? 'republican' : 'democrat';
                    if (!metrics.successRate.byParty[party]) {
                        metrics.successRate.byParty[party] = { total: 0, passed: 0 };
                    }
                    metrics.successRate.byParty[party].total++;

                    const actions = bill.actions || []; // Ensure actions is always an array
                    if (actions.length > 0) {
                        const passed = actions.some(action =>
                            action.description.toLowerCase().includes('public law')
                        );
                        if (passed) {
                            metrics.successRate.byParty[party].passed++;
                        }
                    }
                    // const actions = bill.actions || []; // Ensure actions is always an array
                    // if (actions.some(action =>
                    //     action.description.toLowerCase().includes('public law')
                    // )) {
                    //     metrics.successRate.byParty[party].passed++;
                    // }
                }
            });
        }
    });

    return metrics;
};

const displayAnalytics = () => {
    // console.log('All Bills:', allBills); // Log all bills
    // console.log('Searched Bills:', bills); // Log searched bills

    // Metrics for all bills (overview)
    const allBillsMetrics = getLegislatorMetrics(allBills);

    // Metrics for searched bills (legislator-specific)
    const searchedBillsMetrics = getLegislatorMetrics(bills);

    // Extract the year and legislator(s) searched for
    const year = document.getElementById('yearInput').value;
    const searchedLegislators = searchTerm.split(',').map(name => name.trim());

    // Generate the analytics HTML
    const analyticsHTML = `
        <div class="analytics-container">
            <!-- Overview of All Bills by Party -->
            <div class="overview-section">
                <div class="bill-card">
                    <h3 class="title">Overview of All Bills by Party (${year})</h3>
                    
                    <!-- Bill Distribution by Chamber and Party -->
                    <h4>Bill Distribution by Chamber and Party:</h4>
                    <p>Total Bills: ${allBillsMetrics.totalBills}</p>
                    
                    <h5>Senate:</h5>
                    <p>Republican: ${allBillsMetrics.billsByChamberAndParty.senate.republican} bills</p>
                    <p>Democrat: ${allBillsMetrics.billsByChamberAndParty.senate.democrat} bills</p>
                    
                    <h5>House:</h5>
                    <p>Republican: ${allBillsMetrics.billsByChamberAndParty.house.republican} bills</p>
                    <p>Democrat: ${allBillsMetrics.billsByChamberAndParty.house.democrat} bills</p>
                    
                    <!-- Bipartisan Collaboration -->
                    <h4>Bipartisan Collaboration:</h4>
                    <p>Bipartisan Bills: ${allBillsMetrics.bipartisanBills}</p>
                    ${Object.entries(allBillsMetrics.partyCollaboration)
                        .map(([parties, count]) => 
                            `<p>${parties}: ${count} bills</p>`
                        ).join('')}
                </div>
            </div>

            <!-- Legislator-Specific Analytics -->
            <div class="legislator-section">
                <div class="bill-card">
                    <h3 class="title">Analytics for ${searchedLegislators.join(', ')} (${year})</h3>
                    
                    <h4>Bill Types:</h4>
                    <p>Authored: ${searchedBillsMetrics.billsByType.authored}</p>
                    <p>Coauthored: ${searchedBillsMetrics.billsByType.coauthored}</p>
                    <p>Sponsored: ${searchedBillsMetrics.billsByType.sponsored}</p>
                    <p>Cosponsored: ${searchedBillsMetrics.billsByType.cosponsored}</p>
                    
                    <h4>Most Active Authors:</h4>
                    <ol>
                        ${searchedBillsMetrics.mostActiveAuthors
                            .map(({name, count}) => 
                                `<li>${abbreviateTitle(name)}: ${count} bills</li>`
                            ).join('')}
                    </ol>
                    
                    <h4>Success Rate:</h4>
                    <p>Overall: ${((searchedBillsMetrics.successRate.passed/searchedBillsMetrics.successRate.total)*100).toFixed(1)}%</p>
                    ${Object.entries(searchedBillsMetrics.successRate.byParty)
                        .map(([party, stats]) => 
                            `<p>${party}: ${((stats.passed/stats.total)*100).toFixed(1)}% (${stats.passed}/${stats.total})</p>`
                        ).join('')}
                    
                    <h4>Collaboration Metrics:</h4>
                    <p>Total Active Legislators: ${searchedBillsMetrics.activeLegislators.size}</p>
                    <h4>Party Collaboration:</h4>
                    ${Object.entries(searchedBillsMetrics.partyCollaboration)
                        .map(([parties, count]) => 
                            `<p>${parties}: ${count} bills</p>`
                        ).join('')}
                </div>
            </div>
        </div>

        <!-- Word Cloud -->
        <div class="bill-card">
            <h3 class="title">Word Cloud</h3>
            <div id="wordCloud" style="width: 100%; height: 300px;"></div>
        </div>
    `;

    // Insert the analytics HTML into the DOM
    const resultsElement = document.getElementById('results');
    resultsElement.insertAdjacentHTML('beforebegin', analyticsHTML);

    // Generate the word cloud (using searched bills)
    const wordCloudElement = document.getElementById('wordCloud');
    const wordList = Object.entries(searchedBillsMetrics.wordFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50) // Limit to top 50 words
        .map(([word, count]) => [word, count]);

    if (wordList.length > 0) {
        WordCloud(wordCloudElement, {
            list: wordList,
            gridSize: 10,
            weightFactor: 10,
            fontFamily: 'Arial, sans-serif',
            color: 'random-dark',
            backgroundColor: '#f0f0f0',
            rotateRatio: 0.5,
        });
    } else {
        wordCloudElement.innerHTML = "<p>No words found in digests.</p>";
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

// Improve the fetchBillsByLegislator function
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
            const batchSize = 5; // Smaller batch size
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
                    // Update the bill in the set
                    bills.delete(JSON.stringify({ ...bill, details: undefined }));
                    bills.add(JSON.stringify(bill));
                });

                // Update progress
                processedBills += batch.length;
                updateLoadingProgress(processedBills, totalBills);

                // Update UI after each batch
                renderBills();

                // Small delay to prevent browser from freezing
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Hide loading when all batches are done
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
    const year = document.getElementById('yearInput').value;
    await fetchAllBillsForYear(year);
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

    clearResults(); // Clear existing results

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

        // Reset progress
        updateLoadingProgress(0, 1);

        // Fetch and display bills first
        await Promise.all(uniqueLegislators.map((legislator) =>
            fetchBillsByLegislator(legislator.link)
        ));

        renderBills();

        // Calculate analytics after rendering bills
        setTimeout(() => {
            displayAnalytics();
            loading = false;
            document.getElementById('loading').classList.add('hidden');
        }, 100);
    } else {
        document.getElementById('noResults').classList.remove('hidden');
    }
});

// Make handleBillClick available globally
window.handleBillClick = handleBillClick;