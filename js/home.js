import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "./findMyLegislator.js";

document.addEventListener('DOMContentLoaded', function() {
    // Highlight active nav link based on current page
    const currentPath = window.location.pathname;
    const billTrackerLink = document.getElementById('billTracker');
    const budgetLink = document.getElementById('budget');
    const issueLink = document.getElementById('issues');
    
    if (currentPath.includes('bill-tracker')) {
        billTrackerLink.classList.add('active');
    } else if (currentPath.includes('budget')) {
        budgetLink.classList.add('active');
    } else if (currentPath.includes('issues')) {
        issueLink.classList.add('active');
    }
    
    // Set up legislator finder button
    const findBtn = document.getElementById('find-my-legislators-btn');
    if (findBtn) {
        findBtn.addEventListener('click', function() {
            // Check if the showLegislatorFinder function exists
            if (typeof showLegislatorFinder === 'function') {
                showLegislatorFinder();
            } else {
                // Fallback to redirect to the issues page where the finder is available
                window.location.href = '/issues';
            }
        });
    }
});