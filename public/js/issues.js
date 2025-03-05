import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "./findMyLegislator.js";

// Original issues.js functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get all issue items and issue details
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
    const issueItems = document.querySelectorAll('.issue-item');
    const issueDetails = document.querySelectorAll('.issue-detail');
    
    // Set active issue when clicked
    issueItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            issueItems.forEach(i => i.classList.remove('active'));
            issueDetails.forEach(d => d.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Show corresponding detail
            const issueId = this.getAttribute('data-issue');
            document.getElementById(issueId).classList.add('active');
            
            // If on mobile, scroll to content area
            if (window.innerWidth <= 768) {
                const contentArea = document.querySelector('.issues-content');
                contentArea.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Function to initialize issue content
    function initializeIssues() {
        // Ensure first issue is active on page load
        if (issueItems.length > 0 && issueDetails.length > 0) {
            const firstIssue = issueItems[0];
            const firstIssueId = firstIssue.getAttribute('data-issue');
            
            firstIssue.classList.add('active');
            document.getElementById(firstIssueId).classList.add('active');
        }
    }
    
    // Initialize the page
    initializeIssues();
    
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