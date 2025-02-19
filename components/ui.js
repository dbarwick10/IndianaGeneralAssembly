// components/ui.js
import { formatDateTime, abbreviateTitle } from '../analytics/helpers.js';
import { getLegislatorMetrics, processWordCloud } from '../analytics/core.js';
import { ANALYSIS_CONFIG, UI_CONFIG } from '../config.js';

export const renderAutocompleteDropdown = (suggestions) => {
    const dropdown = document.getElementById('autocompleteDropdown');
    dropdown.innerHTML = suggestions.map((legislator) => `
        <li class="autocomplete-item cursor-pointer hover:bg-gray-100 p-2" data-link="${legislator.link}">
            ${abbreviateTitle(legislator.fullName)}
        </li>
    `).join('');
    dropdown.style.display = suggestions.length > 0 ? 'block' : 'none';
};

export const renderBills = (bills, openBills) => {
    const results = document.getElementById('results');
    results.innerHTML = '';

    if (bills.size === 0) {
        document.getElementById('noResults').classList.remove('hidden');
        return;
    }

    const billArray = Array.from(bills)
        .map((bill) => JSON.parse(bill))
        .sort((a, b) => a.billName.localeCompare(b.billName, undefined, { numeric: true }));

    results.innerHTML = [
        renderBillType('authored', billArray.filter((bill) => bill.type === 'authored'), openBills),
        renderBillType('coauthored', billArray.filter((bill) => bill.type === 'coauthored'), openBills),
        renderBillType('sponsored', billArray.filter((bill) => bill.type === 'sponsored'), openBills),
        renderBillType('cosponsored', billArray.filter((bill) => bill.type === 'cosponsored'), openBills)
    ].join('');
};

const renderBillType = (type, bills, openBills) => {
    if (!bills || bills.length === 0) return '';
    
    return `
        <div class="space-y-6">
            <h2 class="text-xl font-bold capitalize">${type} Bills (${bills.length})</h2>
            <div class="space-y-4">
                ${bills.map(bill => renderBillCard(bill, openBills)).join('')}
            </div>
        </div>
    `;
};

const renderBillCard = (bill, openBills) => {
    return `
        <div class="bill-card bg-white rounded-lg shadow-md p-4">
            <details ${openBills[bill.billName] ? 'open' : ''}>
                <summary 
                    class="cursor-pointer flex justify-between items-center hover:bg-gray-50 p-2 rounded"
                    onclick="handleBillClick('${bill.billName}', '${bill.type}')"
                >
                    <span class="font-medium">${bill.billName}</span>
                    <span class="text-gray-600">${bill.description}</span>
                </summary>
                <div class="space-y-4 mt-4 pl-4">
                    ${renderBillDetails(bill)}
                </div>
            </details>
        </div>
    `;
};

const renderBillDetails = (bill) => {
    if (!bill.details) return '';

    return `
        <div class="space-y-4">
            <div>
                <h3 class="font-semibold text-lg">Title</h3>
                <p class="text-gray-700">${bill.details.title}</p>
            </div>
            <div>
                <h3 class="font-semibold text-lg">Description</h3>
                <p class="text-gray-700">${bill.details.description}</p>
            </div>
            ${renderDigest(bill.details)}
            ${renderParticipants(bill.details)}
            ${renderActions(bill.actions)}
        </div>
    `;
};

const renderDigest = (details) => {
    if (!details.latestVersion?.digest) return '';
    
    return `
        <details class="mt-4">
            <summary class="cursor-pointer font-semibold text-lg">Digest</summary>
            <p class="mt-2 text-gray-700 whitespace-pre-wrap">${details.latestVersion.digest}</p>
        </details>
    `;
};

const renderParticipants = (details) => {
    const sections = [
        { title: 'Authors', data: details.authors },
        { title: 'Co-authors', data: details.coauthors },
        { title: 'Sponsors', data: details.sponsors },
        { title: 'Co-sponsors', data: details.cosponsors }
    ];

    return sections
        .filter(section => section.data?.length > 0)
        .map(section => `
            <div class="mt-4">
                <h3 class="font-semibold text-lg">${section.title}</h3>
                <ul class="mt-2 space-y-1">
                    ${section.data.map(person => `
                        <li class="text-gray-700">
                            ${abbreviateTitle(person.fullName)} 
                            <span class="text-gray-500">(${person.party})</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('');
};

const renderActions = (actions) => {
    if (!actions?.length) return '';

    return `
        <div class="mt-4">
            <h3 class="font-semibold text-lg">Actions</h3>
            <ul class="mt-2 space-y-2">
                ${actions.map(action => `
                    <li class="text-gray-700">
                        <span class="font-medium">${formatDateTime(action.date)}:</span>
                        <span>${action.description}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
};

export const displayAnalytics = (bills, searchTerm, year) => {
    // Remove existing analytics
    const existingAnalytics = document.querySelectorAll('.analytics-container, .bill-card');
    existingAnalytics.forEach(container => {
        if (container.querySelector('.title')?.textContent === 'Word Cloud' ||
            container.querySelector('.title')?.textContent.includes('Combined Analytics')) {
            container.remove();
        }
    });

    const metrics = getLegislatorMetrics(bills);
    const searchedLegislators = searchTerm.split(',').map(name => name.trim());

    const analyticsHTML = generateAnalyticsHTML(metrics, searchedLegislators, year);
    const resultsElement = document.getElementById('results');
    resultsElement.insertAdjacentHTML('beforebegin', analyticsHTML);

    generateWordCloud(metrics.wordFrequency);
};

const generateAnalyticsHTML = (metrics, searchedLegislators, year) => {
    return `
        <div class="analytics-container space-y-8">
            ${renderOverviewSection(metrics, searchedLegislators, year)}
            ${renderBipartisanAnalysis(metrics)}
            ${renderCommitteeDynamics(metrics)}
            ${renderTemporalPatterns(metrics)}
            ${renderAmendmentAnalysis(metrics)}
            ${renderTopCollaborations(metrics)}
            ${renderWordCloudSection()}
        </div>
    `;
};

const renderOverviewSection = (metrics, searchedLegislators, year) => {
    return `
        <div class="bill-card bg-white rounded-lg shadow-md p-6">
            <h3 class="title text-xl font-bold mb-4">
                Legislative Overview for ${searchedLegislators.join(' & ')} (${year})
            </h3>
            <div class="grid ${UI_CONFIG.gridLayouts.overview} gap-6">
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
                        <p>Passed: ${metrics.successMetrics.passed} 
                           (${((metrics.successMetrics.passed / metrics.successMetrics.total) * 100).toFixed(1)}%)</p>
                        <p>Pending: ${metrics.successMetrics.pending}</p>
                        <p>Vetoed: ${metrics.successMetrics.vetoed}</p>
                        <p>Avg. Days to Passage: ${metrics.successMetrics.averageTimeToPassage.toFixed(1)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderBipartisanAnalysis = (metrics) => {
    return `
        <div class="bill-card bg-white rounded-lg shadow-md p-6">
            <h3 class="title text-xl font-bold mb-4">Bipartisan Collaboration Analysis</h3>
            <div class="grid ${UI_CONFIG.gridLayouts.standard} gap-6">
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
    `;
};

const renderCommitteeDynamics = (metrics) => {
    return `
        <div class="bill-card bg-white rounded-lg shadow-md p-6">
            <h3 class="title text-xl font-bold mb-4">Committee Dynamics</h3>
            <div class="grid ${UI_CONFIG.gridLayouts.standard} gap-6">
                <div>
                    <h4 class="font-semibold mb-2">Most Active Committees</h4>
                    <div class="space-y-1">
                        ${Object.entries(metrics.committeeDynamics.mostActiveCommittees)
                            .slice(0, UI_CONFIG.maxDisplayedCommittees)
                            .map(([committee, count]) => 
                                `<p>${committee}: ${count} bills</p>`
                            ).join('')}
                    </div>
                </div>
                
                <div>
                    <h4 class="font-semibold mb-2">Committee Statistics</h4>
                    <div class="space-y-1">
                        <p>Average Time in Committee: ${metrics.committeeDynamics.averageTimeInCommittee.toFixed(1)} days</p>
                        <p>Multiple Referrals: ${metrics.committeeDynamics.multipleReferrals}</p>
                        <p>Committee Reassignments: ${metrics.committeeDynamics.committeeReassignments}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderTemporalPatterns = (metrics) => {
    return `
        <div class="bill-card bg-white rounded-lg shadow-md p-6">
            <h3 class="title text-xl font-bold mb-4">Temporal Patterns</h3>
            <div class="grid ${UI_CONFIG.gridLayouts.standard} gap-6">
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
                    <h4 class="font-semibold mb-2">Activity Highlights</h4>
                    <div class="space-y-1">
                        ${metrics.temporalAnalysis.peakActivityDays
                            .map(({date, count}) => 
                                `<p>${date}: ${count} actions</p>`
                            ).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderAmendmentAnalysis = (metrics) => {
    return `
        <div class="bill-card bg-white rounded-lg shadow-md p-6">
            <h3 class="title text-xl font-bold mb-4">Amendment Analysis</h3>
            <div class="grid ${UI_CONFIG.gridLayouts.standard} gap-6">
                <div>
                    <h4 class="font-semibold mb-2">Amendment Statistics</h4>
                    <div class="space-y-1">
                        <p>Total Amendments: ${metrics.amendmentAnalysis.totalAmendments}</p>
                        <p>Successful Amendments: ${metrics.amendmentAnalysis.successfulAmendments}</p>
                        <p>Success Rate: ${((metrics.amendmentAnalysis.successfulAmendments / 
                                          metrics.amendmentAnalysis.totalAmendments) * 100 || 0).toFixed(1)}%</p>
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

                <div>
                    <h4 class="font-semibold mb-2">Amendment Stages</h4>
                    <div class="space-y-1">
                        ${Object.entries(metrics.amendmentAnalysis.amendmentsByStage)
                            .map(([stage, data]) => 
                                `<p>${formatStage(stage)}: ${data.successful}/${data.total} 
                                    (${((data.successful / data.total) * 100 || 0).toFixed(1)}%)</p>`
                            ).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderTopCollaborations = (metrics) => {
    return `
        <div class="bill-card bg-white rounded-lg shadow-md p-6">
            <h3 class="title text-xl font-bold mb-4">Top Collaborations</h3>
            <div class="grid ${UI_CONFIG.gridLayouts.standard} gap-6">
                <div>
                    <h4 class="font-semibold mb-2">Most Frequent Collaborator Pairs</h4>
                    <div class="space-y-1">
                        ${Object.entries(metrics.legislatorActivity.mostFrequentCollaborators)
                            .slice(0, UI_CONFIG.maxDisplayedCollaborators)
                            .map(([pair, count]) => 
                                `<p>${pair.split('-').map(name => abbreviateTitle(name)).join(' & ')}: 
                                    ${count} collaborations</p>`
                            ).join('')}
                    </div>
                </div>
                
                <div>
                    <h4 class="font-semibold mb-2">Active Legislators</h4>
                    <div class="space-y-1">
                        <p>Total Active Legislators: ${metrics.legislatorActivity.activeLegislators.size}</p>
                        ${renderLeadershipActivity(metrics.legislatorActivity.leadershipActivity)}
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderLeadershipActivity = (leadershipActivity) => {
    if (Object.keys(leadershipActivity).length === 0) return '';

    return `
        <div class="mt-4">
            <h5 class="font-semibold">Leadership Participation</h5>
            <div class="space-y-1 mt-2">
                ${Object.entries(leadershipActivity)
                    .map(([leader, count]) => 
                        `<p>${abbreviateTitle(leader)}: ${count} bills</p>`
                    ).join('')}
            </div>
        </div>
    `;
};

const renderWordCloudSection = () => {
    return `
        <div class="bill-card bg-white rounded-lg shadow-md p-6">
            <h3 class="title text-xl font-bold mb-4">Word Cloud</h3>
            <div id="wordCloud" class="${UI_CONFIG.wordCloudHeight}"></div>
        </div>
    `;
};

const generateWordCloud = (wordFrequency) => {
    const wordCloudElement = document.getElementById('wordCloud');
    if (!wordCloudElement) return;

    const wordList = processWordCloud(wordFrequency);

    if (wordList.length > 0) {
        WordCloud(wordCloudElement, {
            list: wordList,
            ...ANALYSIS_CONFIG.wordCloud.config
        });
    } else {
        wordCloudElement.innerHTML = `
            <p class="text-gray-500 text-center">No significant words found in bill digests.</p>
        `;
    }
};

export const updateLoadingProgress = (current, total) => {
    const percentage = Math.round((current / total) * 100);
    const progressText = document.getElementById('loadingProgress');
    const progressBar = document.getElementById('progressIndicator');
    
    if (progressText) progressText.textContent = percentage;
    if (progressBar) progressBar.style.width = `${percentage}%`;
};

const formatStage = (stage) => {
    return {
        'committee': 'Committee',
        'secondReading': 'Second Reading',
        'thirdReading': 'Third Reading'
    }[stage] || stage;
};

// Loading and Error UI
export const showLoading = () => {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('hidden');
};

export const hideLoading = () => {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
};

export const showError = (message) => {
    const errorContainer = document.getElementById('errorContainer');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span class="block sm:inline">${message}</span>
                <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                    <svg class="fill-current h-6 w-6 text-red-500" role="button" 
                         onclick="this.parentElement.parentElement.remove()"
                         xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
                    </svg>
                </span>
            </div>
        `;
        setTimeout(() => {
            const alert = errorContainer.querySelector('.bg-red-100');
            if (alert) alert.remove();
        }, 5000);
    }
};