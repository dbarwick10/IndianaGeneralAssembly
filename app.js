// app.js
import { 
    fetchLegislators, 
    fetchBillsByLegislator, 
    fetchBillDetails, 
    fetchBillActions, 
    clearCaches 
} from './services/api.js';

import { 
    renderAutocompleteDropdown, 
    renderBills, 
    displayAnalytics, 
    updateLoadingProgress 
} from './components/ui.js';

import { 
    abbreviateTitle 
} from './analytics/helpers.js';

import { 
    ANALYSIS_CONFIG, 
    UI_CONFIG 
} from './config.js';

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
        // Load legislators on startup
        legislators = await fetchLegislators();
        
        // Set up year input default
        const yearInput = document.getElementById('yearInput');
        const currentYear = new Date().getFullYear();
        yearInput.value = currentYear;
        
        // Add event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Error during page load:', error);
        showError('Failed to initialize application');
    }
};

const setupEventListeners = () => {
    // Search input handler
    document.getElementById('searchInput').addEventListener('input', handleSearchInput);
    
    // Autocomplete dropdown handler
    document.getElementById('autocompleteDropdown').addEventListener('click', handleAutocompleteSelection);
    
    // Year input handler
    document.getElementById('yearInput').addEventListener('change', handleYearChange);
    
    // Search button handler
    document.getElementById('searchButton').addEventListener('click', handleSearch);
};

const handleSearchInput = (e) => {
    searchTerm = e.target.value;
    const lastTerm = searchTerm.split(',').pop().trim();

    if (lastTerm.length > 0) {
        suggestions = legislators.filter((legislator) =>
            abbreviateTitle(legislator.fullName).toLowerCase().includes(lastTerm.toLowerCase())
        );
        renderAutocompleteDropdown(suggestions);
    } else {
        suggestions = [];
        document.getElementById('autocompleteDropdown').style.display = 'none';
    }
};

const handleAutocompleteSelection = (e) => {
    if (e.target.classList.contains('autocomplete-item')) {
        const link = e.target.getAttribute('data-link');
        const name = abbreviateTitle(e.target.textContent.trim());

        const terms = searchTerm.split(',');
        terms[terms.length - 1] = name;
        searchTerm = terms.join(', ');

        document.getElementById('searchInput').value = searchTerm;
        document.getElementById('autocompleteDropdown').style.display = 'none';
    }
};

const handleYearChange = async () => {
    clearCaches();
    clearResults();
};

const handleSearch = async () => {
    const year = document.getElementById('yearInput').value;
    if (!year) {
        showError('Please enter a year');
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
        await performSearch(uniqueLegislators);
    } else {
        document.getElementById('noResults').classList.remove('hidden');
    }
};

const performSearch = async (uniqueLegislators) => {
    try {
        loading = true;
        showLoading();

        await Promise.all(uniqueLegislators.map(legislator => {
            return fetchLegislatorBills(legislator).catch(error => {
                console.error(`Error fetching bills for ${legislator.fullName}:`, error);
                return []; // Continue with other legislators even if one fails
            });
        }));

        if (bills.size === 0) {
            document.getElementById('noResults').classList.remove('hidden');
        } else {
            renderBills(bills, openBills);
        }
    } catch (error) {
        console.error('Error performing search:', error);
        showError('Failed to fetch legislator bills. Please try again.');
    } finally {
        loading = false;
        hideLoading();
    }
};

const fetchLegislatorBills = async (legislator) => {
    const year = document.getElementById('yearInput').value;
    const userId = legislator.link.split('/').pop();

    try {
        // Fetch bills for all types
        const billsByType = await Promise.all(
            ANALYSIS_CONFIG.billTypes.map(async type => {
                const response = await fetchBillsByLegislator(userId, year, type);
                return { 
                    type, 
                    bills: response || [] // Ensure we always have an array, even if empty
                };
            })
        );

        // Process and flatten the bills
        const simpleBills = billsByType.flatMap(({ type, bills }) => {
            if (!Array.isArray(bills)) {
                console.warn(`Invalid bills data for type ${type}:`, bills);
                return [];
            }
            
            return bills
                .filter(bill => bill && bill.billName)  // Ensure bill object exists and has billName
                .filter(bill => 
                    ANALYSIS_CONFIG.validBillPrefixes.some(prefix => 
                        bill.billName.startsWith(prefix)
                    )
                )
                .map(bill => ({ ...bill, type }));
        });

        // Add to bills set and start background loading
        simpleBills.forEach(bill => bills.add(JSON.stringify(bill)));
        await loadDetailsInBackground(simpleBills);

    } catch (error) {
        console.error('Error fetching legislator bills:', error);
        throw error;
    }
};

const loadDetailsInBackground = async (simpleBills) => {
    const batches = [];
    for (let i = 0; i < simpleBills.length; i += ANALYSIS_CONFIG.batchSize) {
        batches.push(simpleBills.slice(i, i + ANALYSIS_CONFIG.batchSize));
    }

    const year = document.getElementById('yearInput').value;
    let processedBills = 0;
    const totalBills = simpleBills.length;

    for (const batch of batches) {
        try {
            const detailedBills = await Promise.all(
                batch.map(async (bill) => {
                    const details = await fetchBillDetails(bill.billName, year);
                    return { ...bill, details };
                })
            );

            detailedBills.forEach(bill => {
                bills.delete(JSON.stringify({ ...bill, details: undefined }));
                bills.add(JSON.stringify(bill));
            });

            processedBills += batch.length;
            updateLoadingProgress(processedBills, totalBills);
            renderBills(bills, openBills);

            await new Promise(resolve => setTimeout(resolve, UI_CONFIG.loadingDelay));
        } catch (error) {
            console.error('Error loading bill details:', error);
        }
    }

    displayAnalytics(bills, searchTerm, year);
    hideLoading();
};

export const handleBillClick = async (billName, type) => {
    openBills[billName] = !openBills[billName];
  
    if (openBills[billName]) {
        const billString = Array.from(bills).find((b) => JSON.parse(b).billName === billName);
        if (billString) {
            const bill = JSON.parse(billString);
            if (!bill.actions) {
                try {
                    const year = document.getElementById('yearInput').value;
                    const actions = await fetchBillActions(billName, year);
                    
                    bills.delete(billString);
                    bills.add(JSON.stringify({ ...bill, actions }));
                } catch (error) {
                    console.error('Error fetching bill actions:', error);
                    showError('Failed to fetch bill actions');
                }
            }
        }
    }
  
    renderBills(bills, openBills);
};

const clearResults = () => {
    document.getElementById('results').innerHTML = '';
    document.getElementById('noResults').classList.add('hidden');
    bills = new Set();
    openBills = {};

    // Remove analytics containers
    const analyticsContainers = document.querySelectorAll('.analytics-container');
    analyticsContainers.forEach(container => container.remove());
    
    // Remove word cloud
    const wordCloudContainer = document.querySelector('.bill-card .title');
    if (wordCloudContainer?.textContent === 'Word Cloud') {
        wordCloudContainer.closest('.bill-card').remove();
    }
};

const showLoading = () => {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('noResults').classList.add('hidden');
    updateLoadingProgress(0, 1);
};

const hideLoading = () => {
    document.getElementById('loading').classList.add('hidden');
};

const showError = (message) => {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        setTimeout(() => {
            errorContainer.classList.add('hidden');
        }, 3000);
    } else {
        alert(message);
    }
};

// Make handleBillClick available globally
window.handleBillClick = handleBillClick;