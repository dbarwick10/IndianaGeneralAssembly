let legislators = [];
let bills = new Set(); // Use a Set to store unique bills
let loading = false;
let searchTerm = '';
let suggestions = [];
let openBills = {}; // Track open/close state of bills

// Fetch legislators on page load
window.onload = async () => {
    try {
        const response = await fetch('http://localhost:3000/legislators');
        const data = await response.json();
        legislators = data.items || [];
    } catch (error) {
        console.error('Error fetching legislators:', error);
    }
};

// Function to abbreviate titles
const abbreviateTitle = (name) => {
    return name
        .replace(/\bRepresentative\b/g, 'Rep.') // Replace "Representative" with "Rep."
        .replace(/\bSenator\b/g, 'Sen.'); // Replace "Senator" with "Sen."
};

// Handle input change for autocomplete
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    const lastTerm = searchTerm.split(',').pop().trim(); // Get the last term after the last comma

    if (lastTerm.length > 0) {
        const filteredLegislators = legislators.filter((legislator) =>
            abbreviateTitle(legislator.fullName).toLowerCase().includes(lastTerm.toLowerCase())
        );
        suggestions = filteredLegislators;
        renderAutocompleteDropdown(); // Render the dropdown with abbreviated names
    } else {
        suggestions = [];
        document.getElementById('autocompleteDropdown').style.display = 'none';
    }
});

// Handle clicking on autocomplete item
document.getElementById('autocompleteDropdown').addEventListener('click', (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        const link = e.target.getAttribute('data-link');
        const name = abbreviateTitle(e.target.textContent.trim()); // Abbreviate and trim the name

        // Get the current input value and replace the last term with the selected name
        const terms = searchTerm.split(','); // Split by commas
        terms[terms.length - 1] = name; // Replace the last term
        searchTerm = terms.join(', '); // Join with commas and spaces

        document.getElementById('searchInput').value = searchTerm; // Update input field value
        document.getElementById('autocompleteDropdown').style.display = 'none';
    }
});

// Handle search button click
document.getElementById('searchButton').addEventListener('click', () => {
    const names = searchTerm.split(',').map((name) => name.trim()); // Split by comma and trim
    const uniqueLegislators = names.map((name) =>
        legislators.find((l) =>
            abbreviateTitle(l.fullName).toLowerCase() === name.toLowerCase()
        )
    ).filter(Boolean); // Filter out undefined values

    if (uniqueLegislators.length > 0) {
        bills = new Set(); // Reset bills
        uniqueLegislators.forEach((legislator) => {
            fetchBillsByLegislator(legislator.link);
        });
    } else {
        document.getElementById('results').innerHTML = '';
        document.getElementById('noResults').classList.remove('hidden');
    }
});

// Render autocomplete dropdown
const renderAutocompleteDropdown = () => {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.innerHTML = suggestions.map((legislator) => `
        <li class="autocomplete-item" data-link="${legislator.link}">
            ${abbreviateTitle(legislator.fullName)} <!-- Abbreviate the name -->
        </li>
    `).join('');
    dropdown.style.display = suggestions.length > 0 ? 'block' : 'none';
};

// Fetch bill details
const fetchBillDetails = async (billName) => {
    try {
        const response = await fetch(`http://localhost:3000/2024/bills/${billName}`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching bill details:', error);
        return null;
    }
};

// Fetch bill actions
const fetchBillActions = async (billName) => {
    try {
        const response = await fetch(`http://localhost:3000/2024/bills/${billName}/actions`);
        if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Error fetching bill actions:', error);
        return [];
    }
};

// Format date and time
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

// Handle bill click to toggle open/close state and fetch details if needed
const handleBillClick = async (billName, type) => {
    // Toggle the open/close state
    openBills[billName] = !openBills[billName];

    // If the bill is open and details/actions haven't been fetched yet, fetch them
    if (openBills[billName]) {
        const bill = Array.from(bills).find((b) => JSON.parse(b).billName === billName);
        if (bill && (!JSON.parse(bill).details || !JSON.parse(bill).actions)) {
            const [details, actions] = await Promise.all([
                fetchBillDetails(billName),
                fetchBillActions(billName),
            ]);

            // Update the bill in the Set
            bills.delete(bill);
            bills.add(JSON.stringify({ ...JSON.parse(bill), details, actions }));
        }
    }

    // Re-render bills
    renderBills();
};

// Fetch bills by legislator
const fetchBillsByLegislator = async (legislatorLink) => {
    loading = true;
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('noResults').classList.add('hidden');
    document.getElementById('results').innerHTML = '';

    try {
        const billsUrl = `http://localhost:3000${legislatorLink}/bills`;
        const billsResponse = await fetch(billsUrl);
        if (!billsResponse.ok) throw new Error(`Error ${billsResponse.status}: ${billsResponse.statusText}`);
        const billsData = await billsResponse.json();

        const fetchBillsByType = async (type) => {
            const response = await fetch(`http://localhost:3000${billsData[type].link}`);
            if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
            const data = await response.json();
            return data.items || [];
        };

        const [authored, coauthored, sponsored, cosponsored] = await Promise.all([
            fetchBillsByType('authored'),
            fetchBillsByType('coauthored'),
            fetchBillsByType('sponsored'),
            fetchBillsByType('cosponsored'),
        ]);

        // Add bills to the Set to ensure uniqueness
        authored.forEach((bill) => bills.add(JSON.stringify({ ...bill, type: 'authored' })));
        coauthored.forEach((bill) => bills.add(JSON.stringify({ ...bill, type: 'coauthored' })));
        sponsored.forEach((bill) => bills.add(JSON.stringify({ ...bill, type: 'sponsored' })));
        cosponsored.forEach((bill) => bills.add(JSON.stringify({ ...bill, type: 'cosponsored' })));

        // Sort bills by billName
        const sortedBills = Array.from(bills)
            .map((bill) => JSON.parse(bill))
            .sort((a, b) => a.billName.localeCompare(b.billName, undefined, { numeric: true }));

        // Update the bills Set with sorted bills
        bills = new Set(sortedBills.map((bill) => JSON.stringify(bill)));

        renderBills();
    } catch (error) {
        console.error('Error fetching bills:', error);
    }
    loading = false;
    document.getElementById('loading').classList.add('hidden');
};

// Render bills
const renderBills = () => {
    const results = document.getElementById('results');
    results.innerHTML = '';

    if (bills.size === 0) {
        document.getElementById('noResults').classList.remove('hidden');
        return;
    }

    // Convert the Set to an array and sort by billName
    const billArray = Array.from(bills)
        .map((bill) => JSON.parse(bill))
        .sort((a, b) => a.billName.localeCompare(b.billName, undefined, { numeric: true }));

    const renderBillType = (type, bills) => {
        if (!bills || bills.length === 0) return '';
        return `
            <div class="mb-6">
                <h2 class="text-xl font-bold mb-4 capitalize">${type} Bills</h2>
                <div class="space-y-4">
                    ${bills.map((bill) => `
                        <div class="bill-card">
                            <details ${openBills[bill.billName] ? 'open' : ''}>
                                <summary class="font-bold cursor-pointer" onclick="handleBillClick('${bill.billName}', '${type}')">
                                    ${bill.billName} - ${bill.description}
                                </summary>
                                <div class="mt-2">
                                    ${bill.details ? `
                                        <p class="text-gray-700"><strong>Title:</strong> ${bill.details.title}</p>
                                        <p class="text-gray-700"><strong>Description:</strong> ${bill.details.description}</p>
                                        ${bill.details.latestVersion ? `
                                            <details class="mt-2">
                                                <summary class="text-blue-500 cursor-pointer"><strong>Digest</strong></summary>
                                                <p class="text-gray-700 mt-2">${bill.details.latestVersion.digest}</p>
                                            </details>
                                        ` : ''}
                                        ${bill.details.authors && bill.details.authors.length > 0 ? `
                                            <div class="mt-4">
                                                <h3 class="font-semibold">Authors:</h3>
                                                <ul class="list-disc pl-6">
                                                    ${bill.details.authors.map((author) => `
                                                        <li class="text-gray-700">${abbreviateTitle(author.fullName)} (${author.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.coauthors && bill.details.coauthors.length > 0 ? `
                                            <div class="mt-4">
                                                <h3 class="font-semibold">Co-authors:</h3>
                                                <ul class="list-disc pl-6">
                                                    ${bill.details.coauthors.map((coauthor) => `
                                                        <li class="text-gray-700">${abbreviateTitle(coauthor.fullName)} (${coauthor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.sponsors && bill.details.sponsors.length > 0 ? `
                                            <div class="mt-4">
                                                <h3 class="font-semibold">Sponsors:</h3>
                                                <ul class="list-disc pl-6">
                                                    ${bill.details.sponsors.map((sponsor) => `
                                                        <li class="text-gray-700">${abbreviateTitle(sponsor.fullName)} (${sponsor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.details.cosponsors && bill.details.cosponsors.length > 0 ? `
                                            <div class="mt-4">
                                                <h3 class="font-semibold">Co-sponsors:</h3>
                                                <ul class="list-disc pl-6">
                                                    ${bill.details.cosponsors.map((cosponsor) => `
                                                        <li class="text-gray-700">${abbreviateTitle(cosponsor.fullName)} (${cosponsor.party})</li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                        ${bill.actions && bill.actions.length > 0 ? `
                                            <div class="mt-4">
                                                <h3 class="font-semibold">Actions:</h3>
                                                <ul class="list-disc pl-6">
                                                    ${bill.actions.map((action) => `
                                                        <li class="text-gray-700"><strong>${formatDateTime(action.date)}:</strong> ${action.description}</li>
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