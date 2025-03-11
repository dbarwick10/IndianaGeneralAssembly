import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "./findMyLegislator.js";

document.addEventListener('DOMContentLoaded', function() {
    // Highlight active nav link based on current page
    const currentPath = window.location.pathname;
    const billTrackerLink = document.getElementById('billTracker');
    const budgetLink = document.getElementById('budget');
    const issueLink = document.getElementById('issues');
    
    if (currentPath.includes('index.html') || currentPath === '/' || currentPath === '') {
        billTrackerLink.classList.add('active');
    } else if (currentPath.includes('budget')) {
        budgetLink.classList.add('active');
    } else if (currentPath.includes('issues')) {
        issueLink.classList.add('active');
    }

    // Set up legislator finder
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

    // Fetch and load issue content
    loadIssuesData();
});

// Function to load issues data from markdown files
async function loadIssuesData() {
    try {
        // Fetch the issues index
        const response = await fetch('../issues/bills/index.json');
        if (!response.ok) throw new Error(`Failed to load issues index: ${response.status}`);
        
        const issuesData = await response.json();
        
        // Create the sidebar navigation
        createIssuesSidebar(issuesData.issues);
        
        // Show welcome screen by default
        showWelcomeScreen();
    } catch (error) {
        console.error('Error loading issues data:', error);
        document.querySelector('.issues-content').innerHTML = `
            <div class="error-message">
                Failed to load issues content. Please try again later.
                <br>Error: ${error.message}
            </div>
        `;
    }
}

// Create the sidebar navigation from issues data
function createIssuesSidebar(issues) {
    const sidebarList = document.querySelector('.issues-list');
    if (!sidebarList) return;
    
    // Clear existing content
    sidebarList.innerHTML = '';
    
    // Add each issue as a navigation item
    issues.forEach(issue => {
        const listItem = document.createElement('li');
        listItem.className = 'issue-item';
        listItem.setAttribute('data-issue', issue.id);
        listItem.textContent = issue.title;
        
        // Add click event to navigate to the issues page with the appropriate hash
        listItem.addEventListener('click', function() {
            // Navigate to the issues page with the bill ID in the hash
            window.location.href = `/issues/#${issue.id}`;
        });
        
        sidebarList.appendChild(listItem);
    });
}

// Function to display welcome/intro screen
function showWelcomeScreen() {
    const contentContainer = document.querySelector('.issues-content');
    if (!contentContainer) return;
    
    // Display welcome content
    contentContainer.innerHTML = `
        <div class="issue-detail active">
            <h1 class="issue-title">Welcome to LegisAlert</h1>
            
            <div class="issue-description">
                <p>LegisAlert helps you stay informed about important legislative bills in the Indiana General Assembly and track their progress.</p>
                <p>Select a bill from the sidebar to view its details, description, and call scripts for contacting your representatives.</p>
            </div>
            
            <div class="related-bills">
                <h3>How to use this tool:</h3>
                <div class="bill-item">
                    <div class="bill-title">1. Find your legislators</div>
                    <div class="bill-description">Use the "Find My Legislators" button to locate your State Representative and Senator based on your address.</div>
                </div>
                <div class="bill-item">
                    <div class="bill-title">2. Browse bills in the sidebar</div>
                    <div class="bill-description">Review the list of key bills currently being tracked.</div>
                </div>
                <div class="bill-item">
                    <div class="bill-title">3. View bill details</div>
                    <div class="bill-description">Click on any bill to see its full description, status, and call scripts.</div>
                </div>
                <div class="bill-item">
                    <div class="bill-title">4. Contact your legislators</div>
                    <div class="bill-description">Use the provided call scripts to make your voice heard on issues that matter to you.</div>
                </div>
            </div>
            
            <div class="call-script">
                <h3>Why Calling Works</h3>
                <div class="script-container">
                    <p class="script-intro">When constituents call their legislators, it creates a tangible record of public opinion that can influence policy decisions.</p>
                    <div class="script-content">
                        <p>Legislative offices track constituent communications, and even just a few calls on an issue can make a difference in how a legislator votes. When you call, you're not just expressing your views – you're participating directly in the democratic process.</p>
                    </div>
                    <p class="script-tip"><strong>Tip:</strong> Personal stories and local impacts are especially powerful when communicating with your legislators.</p>
                </div>
            </div>
        </div>
    `;
}