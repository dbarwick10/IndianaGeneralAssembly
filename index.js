// Global state
let legislators = [];
let bills = new Set();
let loading = false;
let searchTerm = '';
let suggestions = [];
let openBills = {};

// Initialize the application
window.onload = async () => {
    try {
        // Fetch legislators from the backend
        const response = await fetch(`http://localhost:3000/legislators`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        legislators = data.items || []; // Ensure the response has an `items` array
    } catch (error) {
        console.error('Error fetching legislators:', error);
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
const getLegislatorMetrics = () => {
    const metrics = {
        totalBills: 0,
        billsByParty: {},
        billsByType: {
            authored: 0,
            coauthored: 0,
            sponsored: 0,
            cosponsored: 0
        },
        bipartisanBills: 0,
        partyCollaboration: {},
        activeLegislators: new Set(),
        mostActiveAuthors: [],
        successRate: {
            total: 0,
            passed: 0,
            byParty: {}
        }
    };

    const billsArray = Array.from(bills).map(bill => JSON.parse(bill));
    
    billsArray.forEach(bill => {
        metrics.totalBills++;
        metrics.billsByType[bill.type]++;

        if (bill.details) {
            // Process authors
            if (bill.details.authors) {
                bill.details.authors.forEach(author => {
                    metrics.activeLegislators.add(author.fullName);
                    if (author.party) {
                        metrics.billsByParty[author.party] = (metrics.billsByParty[author.party] || 0) + 1;
                    }
                });
            }

            // Process all participants
            const allParticipants = [
                ...(bill.details.authors || []),
                ...(bill.details.coauthors || []),
                ...(bill.details.sponsors || []),
                ...(bill.details.cosponsors || [])
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
            if (bill.actions) {
                const passed = bill.actions.some(action => 
                    action.description.toLowerCase().includes('public law'));
                if (passed) {
                    metrics.successRate.passed++;
                }
            }
        }
    });

    // Calculate most active authors
    const authorCount = {};
    billsArray.forEach(bill => {
        if (bill.details?.authors) {
            bill.details.authors.forEach(author => {
                authorCount[author.fullName] = (authorCount[author.fullName] || 0) + 1;
            });
        }
    });

    metrics.mostActiveAuthors = Object.entries(authorCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    metrics.successRate.total = metrics.totalBills;

    return metrics;
};

const displayAnalytics = () => {
    const metrics = getLegislatorMetrics();
    
    const analyticsHTML = `
        <div class="bill-card">
            <h2 class="title">Legislative Analytics</h2>
            
            <div class="space-y-6">
                <div class="bill-card">
                    <h3 class="title">Bill Distribution</h3>
                    <p>Total Bills: ${metrics.totalBills}</p>
                    <p>Authored: ${metrics.billsByType.authored}</p>
                    <p>Coauthored: ${metrics.billsByType.coauthored}</p>
                    <p>Sponsored: ${metrics.billsByType.sponsored}</p>
                    <p>Cosponsored: ${metrics.billsByType.cosponsored}</p>
                </div>

                <div class="bill-card">
                    <h3 class="title">Party Statistics</h3>
                    ${Object.entries(metrics.billsByParty)
                        .map(([party, count]) => 
                            `<p>${party}: ${count} bills (${((count/metrics.totalBills)*100).toFixed(1)}%)</p>`
                        ).join('')}
                    <p>Bipartisan Bills: ${metrics.bipartisanBills}</p>
                </div>

                <div class="bill-card">
                    <h3 class="title">Most Active Authors</h3>
                    <ol>
                        ${metrics.mostActiveAuthors
                            .map(({name, count}) => 
                                `<li>${abbreviateTitle(name)}: ${count} bills</li>`
                            ).join('')}
                    </ol>
                </div>

                <div class="bill-card">
                    <h3 class="title">% Bills to Law</h3>
                    <p>Overall: ${((metrics.successRate.passed/metrics.successRate.total)*100).toFixed(1)}%</p>
                    ${Object.entries(metrics.successRate.byParty)
                        .map(([party, stats]) => 
                            `<p>${party}: ${((stats.passed/stats.total)*100).toFixed(1)}% (${stats.passed}/${stats.total})</p>`
                        ).join('')}
                </div>

                <div class="bill-card">
                    <h3 class="title">Collaboration Metrics</h3>
                    <p>Total Active Legislators: ${metrics.activeLegislators.size}</p>
                    <h4>Party Collaboration:</h4>
                    ${Object.entries(metrics.partyCollaboration)
                        .map(([parties, count]) => 
                            `<p>${parties}: ${count} bills</p>`
                        ).join('')}
                </div>
            </div>
        </div>
    `;

    const resultsElement = document.getElementById('results');
    resultsElement.insertAdjacentHTML('beforebegin', analyticsHTML);
};

// API Functions
const fetchBillDetails = async (billName) => {
    try {
        const year = document.getElementById('yearInput').value;
        const response = await fetch(`http://localhost:3000/${year}/bills/${billName}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching bill details:', error);
        return null;
    }
};

const fetchBillActions = async (billName) => {
    try {
        const year = document.getElementById('yearInput').value;
        const response = await fetch(`http://localhost:3000/${year}/bills/${billName}/actions`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
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
        const billsUrl = `http://localhost:3000/${year}/legislators/${userId}/bills`;
        const billsResponse = await fetch(billsUrl);
        if (!billsResponse.ok) throw new Error(`Error ${billsResponse.status}: ${billsResponse.statusText}`);
        const billsData = await billsResponse.json();

        const fetchBillsByType = async (type) => {
            const response = await fetch(`http://localhost:3000/${year}/legislators/${userId}/bills/${type}`);
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            const data = await response.json();
            return data.items || [];
        };

        // Fetch all bills by type
        const [authored, coauthored, sponsored, cosponsored] = await Promise.all([
            fetchBillsByType('authored'),
            fetchBillsByType('coauthored'),
            fetchBillsByType('sponsored'),
            fetchBillsByType('cosponsored'),
        ]);

        // Fetch details for all bills
        const fetchDetailsForBills = async (billsList, type) => {
            const detailedBills = await Promise.all(
                billsList.map(async (bill) => {
                    const [details, actions] = await Promise.all([
                        fetchBillDetails(bill.billName),
                        fetchBillActions(bill.billName)
                    ]);
                    return { ...bill, type, details, actions };
                })
            );
            return detailedBills;
        };

        // Fetch details for all bill types concurrently
        const [
            detailedAuthored,
            detailedCoauthored,
            detailedSponsored,
            detailedCosponsored
        ] = await Promise.all([
            fetchDetailsForBills(authored, 'authored'),
            fetchDetailsForBills(coauthored, 'coauthored'),
            fetchDetailsForBills(sponsored, 'sponsored'),
            fetchDetailsForBills(cosponsored, 'cosponsored')
        ]);

        // Add new bills to the global `bills` Set
        [...detailedAuthored, ...detailedCoauthored, ...detailedSponsored, ...detailedCosponsored]
            .forEach(bill => bills.add(JSON.stringify(bill)));
    } catch (error) {
        console.error('Error fetching bills:', error);
        document.getElementById('noResults').classList.remove('hidden');
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

// Event Handlers
const handleBillClick = async (billName, type) => {
    openBills[billName] = !openBills[billName];

    if (openBills[billName]) {
        const bill = Array.from(bills).find((b) => JSON.parse(b).billName === billName);
        if (bill && (!JSON.parse(bill).details || !JSON.parse(bill).actions)) {
            const [details, actions] = await Promise.all([
                fetchBillDetails(billName),
                fetchBillActions(billName),
            ]);

            bills.delete(bill);
            bills.add(JSON.stringify({ ...JSON.parse(bill), details, actions }));
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

document.getElementById('yearInput').addEventListener('change', () => {
    clearResults(); // Clear existing results
    const names = searchTerm.split(',').map((name) => name.trim());
    const uniqueLegislators = names.map((name) =>
        legislators.find((l) =>
            abbreviateTitle(l.fullName).toLowerCase() === name.toLowerCase()
        )
    ).filter(Boolean);

    if (uniqueLegislators.length > 0) {
        uniqueLegislators.forEach((legislator) => {
            fetchBillsByLegislator(legislator.link); // Fetch new results
        });
    }
});

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

        // Fetch bills for all legislators concurrently
        await Promise.all(uniqueLegislators.map((legislator) =>
            fetchBillsByLegislator(legislator.link)
        ));

        // After all bills are fetched, render them and display analytics
        renderBills();
        displayAnalytics(); // Display analytics once for all legislators

        loading = false;
        document.getElementById('loading').classList.add('hidden');
    } else {
        document.getElementById('noResults').classList.remove('hidden');
    }
});

// Make handleBillClick available globally
window.handleBillClick = handleBillClick;