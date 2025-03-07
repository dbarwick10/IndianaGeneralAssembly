// issues.js - Enhanced with Markdown support and call tracking
import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "../findMyLegislator.js";
const testing = false;

document.addEventListener('DOMContentLoaded', async function() {
    // Get all issue items and issue details
    const currentPath = window.location.pathname;
    const billTrackerLink = document.getElementById('billTracker');
    const budgetLink = document.getElementById('budget');
    const issueLink = document.getElementById('issues');
    
    // Highlight active nav link
    if (currentPath.includes('index.html')) {
        billTrackerLink.classList.add('active');
    } else if (currentPath.includes('budget.html')) {
        budgetLink.classList.add('active');
    } else if (currentPath.includes('issues.html')) {
        issueLink.classList.add('active');
    }

    // Check if we need to reset call progress due to date change
    const wasReset = checkForDailyReset();
    
    // Fetch and load issue content
    loadIssuesData();
    handleRouting();
    await initializeCallStats();
    
    // Setup legislator finder
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
    
    // Listen for legislator changes and update scripts
    document.addEventListener('legislatorsLoaded', updateCallScripts);
    
    // If reset occurred, make sure UI is updated after content is loaded
    if (wasReset) {
        setTimeout(() => {
            updateCallTracking();
        }, 1000);
    }
});

// Check if call progress should be reset due to date change
function checkForDailyReset() {
    // Get the last reset date from localStorage
    const lastResetDate = localStorage.getItem('lastCallProgressReset');
    
    // Get the current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // If no last reset date or it's different from today, reset progress
    if (!lastResetDate || lastResetDate !== today) {
        console.log('Performing daily reset of call progress');
        
        // Reset the call progress
        localStorage.removeItem('completedCalls');
        localStorage.setItem('activeCallLegislatorIndex', '0');
        
        // Save the current date as last reset date
        localStorage.setItem('lastCallProgressReset', today);
        
        return true; // Reset was performed
    }
    
    return false; // No reset needed
}

// Function to load issues data from markdown files
async function loadIssuesData() {
    try {
        // Fetch the issues index
        const response = await fetch('bills/index.json');
        if (!response.ok) throw new Error(`Failed to load issues index: ${response.status}`);
        
        const issuesData = await response.json();
        
        // Create the sidebar navigation
        createIssuesSidebar(issuesData.issues);
        
        // Initial load - load the first issue
        // if (issuesData.issues && issuesData.issues.length > 0) {
        //     loadIssueContent(issuesData.issues[0].id);
            
        //     // Set the first item as active
        //     const firstItem = document.querySelector('.issue-item');
        //     if (firstItem) firstItem.classList.add('active');
        // }
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
        
        // Add click event to load content
        listItem.addEventListener('click', function() {
            // Remove active class from all items
            document.querySelectorAll('.issue-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Load the corresponding content
            loadIssueContent(issue.id);
            
            // If on mobile, scroll to content area
            if (window.innerWidth <= 768) {
                const contentArea = document.querySelector('.issues-content');
                contentArea.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        sidebarList.appendChild(listItem);
    });

    // Set up click handlers
    setupIssueClickHandlers();
    
    // Handle initial routing
    handleRouting();
}

// Load the content for a specific issue
async function loadIssueContent(issueId) {
    const contentContainer = document.querySelector('.issues-content');
    if (!contentContainer) return;
    
    // Show loading state
    contentContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <div class="loading-text">Loading content...</div>
        </div>
    `;
    
    try {
        // Fetch the markdown file for this issue
        const response = await fetch(`bills/${issueId}.md`);
        if (!response.ok) throw new Error(`Failed to load issue content: ${response.status}`);
        
        const markdownContent = await response.text();
        
        // Parse the markdown content
        const parsedContent = marked.parse(markdownContent);
        
        // Replace the content
        contentContainer.innerHTML = `
            <div class="issue-detail active">
                ${parsedContent}
            </div>
        `;
        
        // Process any custom elements or functionality after rendering
        processRenderedContent();
        
        // Update call scripts after content is loaded
        updateCallScripts();
        
        // Add call tracking functionality
        updateCallTracking();

        await initializeCallStats();
        
    } catch (error) {
        console.error(`Error loading issue ${issueId}:`, error);
        contentContainer.innerHTML = `
            <div class="error-message">
                Choose an issue from the list to view details.
            </div>
        `;
    }
}

// Process rendered content for special elements or functionality
function processRenderedContent() {
    const issueDetail = document.querySelector('.issue-detail');
    if (!issueDetail) return;
    
    // Find all h2 headings which mark section breaks
    const sectionHeadings = issueDetail.querySelectorAll('h2');
    
    sectionHeadings.forEach(heading => {
        // Get all content between this heading and the next one
        let sectionContent = [];
        let currentElement = heading.nextElementSibling;
        
        while (currentElement && currentElement.tagName !== 'H2') {
            sectionContent.push(currentElement.outerHTML);
            currentElement = currentElement.nextElementSibling;
        }
        
        // Create a section div with the appropriate class based on heading text
        const section = document.createElement('div');
        
        if (heading.textContent.toLowerCase().includes('description')) {
            section.className = 'issue-description';
        } else if (heading.textContent.toLowerCase().includes('related bills') || 
                   heading.textContent.toLowerCase().includes('bills')) {
            section.className = 'related-bills';
            // Add a heading to the bills section
            section.innerHTML = '<h3>Related Bills</h3>';
        } else if (heading.textContent.toLowerCase().includes('call script')) {
            section.className = 'call-script';
            // Add a heading and wrapper to the call script
            section.innerHTML = `
                <h3>Call Script</h3>
                <div class="script-container">
                    <p class="script-intro">When calling your representative about this bill, consider using the following script:</p>
                    <div class="script-content"></div>
                    <p class="script-tip"><strong>Tip:</strong> These bills have passed from one chamber to the next, let the person that you are talking to know that you are calling both of your legislators for increased awareness.</p>
                    <p class="script-tip"><strong>Tip:</strong> Be respectful. The person you talk to is unlikely to be the Representative or Senator themselves.</p>
                </div>
            `;
        }
        
        // Add the section content
        if (section.className === 'call-script') {
            section.querySelector('.script-content').innerHTML = sectionContent.join('');
        } else {
            section.innerHTML += sectionContent.join('');
        }
        
        // Replace the heading and all content up to the next heading with the section
        let elementToRemove = heading;
        while (elementToRemove && elementToRemove !== currentElement) {
            const nextElement = elementToRemove.nextElementSibling;
            elementToRemove.remove();
            elementToRemove = nextElement;
        }
        
        // Insert the section where the heading was
        if (currentElement) {
            issueDetail.insertBefore(section, currentElement);
        } else {
            issueDetail.appendChild(section);
        }
    });
    
    // Process bill items - find h3 headings inside related-bills
    const billsSection = issueDetail.querySelector('.related-bills');
    if (billsSection) {
        const billHeadings = billsSection.querySelectorAll('h3:not(:first-child)');
        
        billHeadings.forEach(heading => {
            // Create a bill item div
            const billItem = document.createElement('div');
            billItem.className = 'bill-item';
            
            // Create title div
            const titleDiv = document.createElement('div');
            titleDiv.className = 'bill-title';
            titleDiv.textContent = heading.textContent;
            
            // Check for status indicators
            if (titleDiv.textContent.includes('[Passed]')) {
                const statusTag = document.createElement('span');
                statusTag.className = 'bill-status status-passed';
                statusTag.textContent = 'Passed';
                titleDiv.appendChild(statusTag);
                
                // Remove the [Passed] text
                titleDiv.textContent = titleDiv.textContent.replace('[Passed]', '');
            } else if (titleDiv.textContent.includes('[In Progress]')) {
                const statusTag = document.createElement('span');
                statusTag.className = 'bill-status status-progress';
                statusTag.textContent = 'In Progress';
                titleDiv.appendChild(statusTag);
                
                // Remove the [In Progress] text
                titleDiv.textContent = titleDiv.textContent.replace('[In Progress]', '');
            }
            
            billItem.appendChild(titleDiv);
            
            // Get the description (next paragraph after heading)
            const description = heading.nextElementSibling;
            if (description && description.tagName === 'P') {
                const descDiv = document.createElement('div');
                descDiv.className = 'bill-description';
                descDiv.textContent = description.textContent;
                billItem.appendChild(descDiv);
                
                // Remove the original elements
                description.remove();
            }
            
            // Replace the heading with the bill item
            heading.replaceWith(billItem);
        });
    }
}

function getLegislatorPhone(legislator) {
    // First try to use the legislator's own phone if available
    if (legislator.phone) {
        return legislator.phone;
    }
    
    // Next try officePhone if available
    if (legislator.officePhone) {
        return legislator.officePhone;
    }
    
    // If no specific phone number, use the chamber's general phone number
    if (legislator.chamber === 'S') {
        return '800-382-9467'; // Senate general number
    } else {
        return '800-382-9841'; // House general number
    }
}

// Update call scripts with legislator information
function updateCallScripts() {
    console.log('Updating call scripts...');
    
    // Get legislators from the correct localStorage keys
    const mySenator = localStorage.getItem('mySenator');
    const myHouseRep = localStorage.getItem('myHouseRep');
    
    console.log('Found from localStorage:', { 
        senator: mySenator ? 'yes' : 'no', 
        houseRep: myHouseRep ? 'yes' : 'no' 
    });
    
    // Get the script container
    const scriptContainer = document.querySelector('.script-container');
    if (!scriptContainer) {
        console.log('No script container found in the DOM');
        return;
    }
    
    // If neither legislator is available, show the find legislators button in the script container
    if (!mySenator && !myHouseRep) {
        console.log('No legislators found in localStorage, adding find legislator button');
        
        // Check if notice already exists
        const existingNotice = document.querySelector('.legislator-notice');
        if (!existingNotice) {
            // Create the notice with the button
            const notice = document.createElement('div');
            notice.className = 'personalized-notice legislator-notice';
            notice.innerHTML = `
                <strong>To personalize this script with your legislator's information:</strong>
                <button id="script-find-legislators-btn" class="button small-button">Find My Legislators</button>
            `;
            
            // Insert at the top of the script container
            scriptContainer.insertBefore(notice, scriptContainer.firstChild);
            
            // Add event listener to the new button
            document.getElementById('script-find-legislators-btn').addEventListener('click', showLegislatorFinder);
        }
        
        return;
    }
    
    // If we have legislators, remove the find legislators notice if it exists
    const existingFindNotice = document.querySelector('.legislator-notice');
    if (existingFindNotice) {
        existingFindNotice.remove();
    }
    
    try {
        // Parse the legislator data
        const legislators = [];
        
        // Add senator if available
        if (mySenator) {
            try {
                const senator = JSON.parse(mySenator);
                if (senator) {
                    senator.chamber = 'S'; // Ensure chamber is set
                    legislators.push(senator);
                    console.log('Added senator:', senator);
                }
            } catch (e) {
                console.error('Error parsing senator data:', e);
            }
        }
        
        // Add house rep if available
        if (myHouseRep) {
            try {
                const houseRep = JSON.parse(myHouseRep);
                if (houseRep) {
                    houseRep.chamber = 'H'; // Ensure chamber is set
                    legislators.push(houseRep);
                    console.log('Added house rep:', houseRep);
                }
            } catch (e) {
                console.error('Error parsing house rep data:', e);
            }
        }
        
        // If no valid legislators found, return
        if (legislators.length === 0) {
            console.log('No valid legislators found after parsing');
            return;
        }
        
        // Find and update script content in the DOM
        console.log('Found script container, looking for content to update');
        
        // Get the active legislator index from localStorage or default to 0
        const activeLegIndex = parseInt(localStorage.getItem('activeCallLegislatorIndex') || '0');
        const activeLegislator = legislators[activeLegIndex < legislators.length ? activeLegIndex : 0];
        
        // Process all paragraph elements in the script container
        const paragraphs = scriptContainer.querySelectorAll('p');
        let anyUpdates = false;
        
        console.log(`Found ${paragraphs.length} paragraphs in script container`);
        
        paragraphs.forEach((paragraph, index) => {
            let content = paragraph.innerHTML;
            let updatedContent = content;
            
            console.log(`Checking paragraph ${index + 1}:`, content);
            
            // Only use the active legislator for replacements
            if (activeLegislator) {
                // Construct the full name with appropriate format
                const title = activeLegislator.chamber === 'S' ? 'Sen.' : 'Rep.';
                const phone = getLegislatorPhone(activeLegislator);
                
                // Use the available name properties
                let fullName = '';
                if (activeLegislator.firstName && activeLegislator.lastName) {
                    fullName = `${title} ${activeLegislator.firstName} ${activeLegislator.lastName}`;
                } else if (activeLegislator.displayName) {
                    fullName = `${title} ${activeLegislator.displayName}`;
                } else if (activeLegislator.name) {
                    fullName = `${title} ${activeLegislator.name}`;
                } else {
                    fullName = `${title} [Name unavailable]`;
                }
                
                console.log(`Active legislator ${activeLegislator.chamber}: "${fullName}"`);
                
                // Define placeholder patterns for names
                const namePatterns = [
                    { pattern: /\[REP\/SEN NAME\]/g, chamber: 'both' },
                    { pattern: /\[REP \/ SEN NAME\]/g, chamber: 'both' },
                    { pattern: /\[REP\/SEN[\s]+NAME\]/g, chamber: 'both' },
                    { pattern: /\[REP[\s]+\/[\s]+SEN[\s]+NAME\]/g, chamber: 'both' },
                    { pattern: /\[SEN NAME\]/g, chamber: 'S' },
                    { pattern: /\[REP NAME\]/g, chamber: 'H' }
                ];
                
                // Define placeholder patterns for phone numbers
                const phonePatterns = [
                    { pattern: /\[PHONE\]/g, chamber: 'both' },
                    { pattern: /\[PHONE NUMBER\]/g, chamber: 'both' },
                    { pattern: /\[REP\/SEN PHONE\]/g, chamber: 'both' },
                    { pattern: /\[SEN PHONE\]/g, chamber: 'S' },
                    { pattern: /\[REP PHONE\]/g, chamber: 'H' }
                ];
                
                // Check and replace name patterns
                namePatterns.forEach(pattern => {
                    if ((pattern.chamber === 'both' || pattern.chamber === activeLegislator.chamber) && 
                        pattern.pattern.test(updatedContent)) {
                        console.log(`Found matching name pattern: ${pattern.pattern}`);
                        
                        // Replace the pattern with the legislator's name
                        updatedContent = updatedContent.replace(pattern.pattern, fullName);
                    }
                });
                
                // Check and replace phone patterns
                phonePatterns.forEach(pattern => {
                    if ((pattern.chamber === 'both' || pattern.chamber === activeLegislator.chamber) && 
                        pattern.pattern.test(updatedContent)) {
                        console.log(`Found matching phone pattern: ${pattern.pattern}`);
                        
                        // Replace the pattern with the legislator's phone
                        updatedContent = updatedContent.replace(pattern.pattern, phone);
                    }
                });
            }
            
            // Update paragraph content if changed
            if (updatedContent !== content) {
                console.log('Paragraph updated:');
                console.log('Before:', content);
                console.log('After:', updatedContent);
                paragraph.innerHTML = updatedContent;
                anyUpdates = true;
            }
        });
        
        // Show the personalization notice if any updates were made or always for active legislator
        // Get active legislator info for the notice
        const title = activeLegislator.chamber === 'S' ? 'Sen.' : 'Rep.';
        const phone = getLegislatorPhone(activeLegislator);
        
        // Format legislator name
        let lastName = '';
        let fullName = '';
        
        if (activeLegislator.firstName && activeLegislator.lastName) {
            fullName = `${title} ${activeLegislator.firstName} ${activeLegislator.lastName}`;
            lastName = activeLegislator.lastName;
        } else if (activeLegislator.displayName) {
            fullName = `${title} ${activeLegislator.displayName}`;
            // Try to extract last name from display name
            const nameParts = activeLegislator.displayName.split(' ');
            lastName = nameParts[nameParts.length - 1] || 'Unknown';
        } else if (activeLegislator.name) {
            fullName = `${title} ${activeLegislator.name}`;
            // Try to extract last name from name
            const nameParts = activeLegislator.name.split(' ');
            lastName = nameParts[nameParts.length - 1] || 'Unknown';
        } else {
            fullName = `${title} [Name unavailable]`;
            lastName = 'Unknown';
        }
        
        // Always create or update the personalization notice to show current legislator
        // Check if notice already exists
        let existingNotice = document.querySelector('.personalized-notice');
        
        if (!existingNotice) {
            // Create new notice
            existingNotice = document.createElement('div');
            existingNotice.className = 'personalized-notice call';
            
            // Insert at the top of the script container
            scriptContainer.insertBefore(existingNotice, scriptContainer.firstChild);
        }
        
        // Always update the notice content with current legislator info
        existingNotice.innerHTML = `
            <strong>Your script has been personalized with your legislator's name.</strong>
        `;
        
    } catch (error) {
        console.error('Error updating call scripts:', error);
    }
}

function updateCallTracking() {
    console.log('Setting up call tracking...');
    
    // Get legislators from localStorage
    const mySenator = localStorage.getItem('mySenator');
    const myHouseRep = localStorage.getItem('myHouseRep');
    
    // If neither is available, return early
    if (!mySenator && !myHouseRep) {
        console.log('No legislators found for call tracking');
        return;
    }
    
    // Get the script container to add tracking after it
    const scriptContainer = document.querySelector('.script-container');
    if (!scriptContainer) {
        console.log('No script container found for call tracking');
        return;
    }
    
    // Check if call tracking section already exists
    if (document.querySelector('.call-tracking')) {
        console.log('Call tracking already exists, removing old one');
        document.querySelector('.call-tracking').remove();
    }
    
    try {
        // Parse legislator data
        const legislators = [];
        
        if (mySenator) {
            try {
                const senator = JSON.parse(mySenator);
                if (senator) {
                    senator.chamber = 'S';
                    legislators.push(senator);
                }
            } catch (e) {
                console.error('Error parsing senator data:', e);
            }
        }
        
        if (myHouseRep) {
            try {
                const houseRep = JSON.parse(myHouseRep);
                if (houseRep) {
                    houseRep.chamber = 'H';
                    legislators.push(houseRep);
                }
            } catch (e) {
                console.error('Error parsing house rep data:', e);
            }
        }
        
        if (legislators.length === 0) {
            console.log('No valid legislators found for call tracking');
            return;
        }
        
        // Get active legislator index or set to 0 if not yet set
        let activeIndex = parseInt(localStorage.getItem('activeCallLegislatorIndex') || '0');
        if (activeIndex >= legislators.length) activeIndex = 0;
        
        // Get completed calls from localStorage or initialize empty array
        const completedCalls = JSON.parse(localStorage.getItem('completedCalls') || '[]');
        
        // Create call tracking section
        const trackingSection = document.createElement('div');
        trackingSection.className = 'call-tracking';
        
        // Create progress indicator
        const progressHeader = document.createElement('div');
        progressHeader.className = 'tracking-progress';
        
        // Calculate remaining calls
        const totalCalls = legislators.length;
        const remainingCalls = totalCalls - completedCalls.length;
        
        progressHeader.innerHTML = `
            <div class="tracking-header">
                <h4>Calling Progress</h4>
                ${remainingCalls > 0 ? 
                    `<span class="calls-remaining">${remainingCalls} call${remainingCalls !== 1 ? 's' : ''} remaining</span>` : 
                    '<span class="calls-complete">All calls completed!</span>'}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(completedCalls.length / totalCalls) * 100}%"></div>
            </div>
        `;
        
        trackingSection.appendChild(progressHeader);
        
        // Create current call info
        if (remainingCalls > 0) {
            const activeLegislator = legislators[activeIndex];
            const title = activeLegislator.chamber === 'S' ? 'Senator' : 'Representative';
            
            // Format name based on available properties
            let fullName = '';
            if (activeLegislator.firstName && activeLegislator.lastName) {
                fullName = `${activeLegislator.firstName} ${activeLegislator.lastName}`;
            } else if (activeLegislator.displayName) {
                fullName = activeLegislator.displayName;
            } else if (activeLegislator.name) {
                fullName = activeLegislator.name;
            } else {
                fullName = '[Name unavailable]';
            }
            
            // Format phone using our helper function
            const phone = getLegislatorPhone(activeLegislator);
            
            // Current legislator info
            const currentCallInfo = document.createElement('div');
            currentCallInfo.className = 'current-call-info';
            currentCallInfo.innerHTML = `
                <h4>Currently Calling: ${title} ${fullName}</h4>
                <p class="legislator-phone"><strong>Phone:</strong> <a href="tel:${phone.replace(/\D/g, '')}">${phone}</a></p>
                <p>District: ${activeLegislator.district || 'N/A'}</p>
                <p>Party: ${activeLegislator.party || 'N/A'}</p>
            `;
            
            trackingSection.appendChild(currentCallInfo);
            
            // Call result buttons
            const callResults = document.createElement('div');
            callResults.className = 'call-results';
            callResults.innerHTML = `
                <p class="result-prompt"><strong>After your call, share the result to show the next representative:</strong></p>
                <div class="result-buttons">
                    <button class="result-btn" data-result="unavailable">Unavailable</button>
                    <button class="result-btn" data-result="voicemail">Left Voicemail</button>
                    <button class="result-btn" data-result="contacted">Made Contact</button>
                    <button class="result-btn" data-result="skip">Skip</button>
                </div>
            `;
            
            trackingSection.appendChild(callResults);
            
            // Add event listeners for call result buttons
            trackingSection.querySelectorAll('.result-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const result = this.getAttribute('data-result');
                    recordCallResult(activeLegislator, result);
                });
            });
        } else {
            // All calls completed message
            const allDoneMessage = document.createElement('div');
            allDoneMessage.className = 'all-calls-complete';
            allDoneMessage.innerHTML = `
                <h4>All Calls Completed!</h4>
                <p>Great job! You've reached out to all your representatives on this issue.</p>
                <button class="reset-calls-btn">Reset Call Progress</button>
            `;
            
            trackingSection.appendChild(allDoneMessage);
            
            // Add reset button listener
            trackingSection.querySelector('.reset-calls-btn').addEventListener('click', function() {
                localStorage.removeItem('completedCalls');
                localStorage.setItem('activeCallLegislatorIndex', '0');
                updateCallTracking();
                updateCallScripts();
            });
        }
        
        // Add the tracking section after the script container
        scriptContainer.parentNode.insertBefore(trackingSection, scriptContainer.nextSibling);
        
    } catch (error) {
        console.error('Error setting up call tracking:', error);
    }
}

// Initialize call statistics - this will run when the page loads
async function initializeCallStats() {
    // Get user's personal call count from localStorage
    const userCallCount = parseInt(localStorage.getItem('userTotalCalls') || '0');
    
    // Try to get global count from server
    let globalCallCount = 0;
    try {
      // Use the same URL base as your other API calls
      const serverUrl = testing ? 'http://localhost:3000' : 'https://indianageneralassembly-production.up.railway.app';
      const response = await fetch(`${serverUrl}/api/calls/count`);
      if (response.ok) {
        const data = await response.json();
        globalCallCount = data.globalCallCount;
      }
    } catch (error) {
      console.error('Error fetching global call count:', error);
      // Fall back to localStorage if server request fails
      globalCallCount = parseInt(localStorage.getItem('globalCallCounter') || '0');
    }
    
    // Create or update the call statistics display
    updateCallStatsDisplay(userCallCount, globalCallCount);
    
    console.log(`Call stats initialized: user calls = ${userCallCount}, global calls = ${globalCallCount}`);
}
  
// Create the call statistics display
function updateCallStatsDisplay(userCalls, globalCalls) {
    // Find the script container to add stats before or after it
    const scriptContainer = document.querySelector('.script-container');
    if (!scriptContainer) return;
    
    // Check if stats container already exists
    let statsContainer = document.querySelector('.call-stats-container');
    
    if (!statsContainer) {
      // Create new stats container
      statsContainer = document.createElement('div');
      statsContainer.className = 'call-stats-container';
      
      // Insert after script intro but before script content
      const scriptIntro = scriptContainer.querySelector('.script-intro');
      if (scriptIntro) {
        scriptIntro.parentNode.insertBefore(statsContainer, scriptIntro.nextSibling);
      } else {
        // Insert at the beginning of script container if no intro
        scriptContainer.insertBefore(statsContainer, scriptContainer.firstChild);
      }
    }
    
    // Update the content of the stats container
    statsContainer.innerHTML = `
      <div class="call-stats">
        <div class="call-stat-item">
          <span class="call-stat-value">${userCalls}</span>
          <span class="call-stat-label">Your Total Calls</span>
        </div>
        <div class="call-stat-item">
          <span class="call-stat-value">${globalCalls}</span>
          <span class="call-stat-label">All Users' Calls</span>
        </div>
      </div>
    `;
}
  
async function recordCallResult(legislator, result) {
    console.log(`Recording call result for ${legislator.chamber === 'S' ? 'Senator' : 'Rep'}: ${result}`);
    
    try {
      // Check if we need to reset progress due to date change
      checkForDailyReset();
      
      // Get existing completed calls or initialize empty array
      const completedCalls = JSON.parse(localStorage.getItem('completedCalls') || '[]');
      const issueID = window.location.hash.substring(1);
      
      // Add this call to completed calls if not skipped
      if (result !== 'skip') {
        completedCalls.push({
          legislatorId: legislator.id || `${legislator.chamber}-${legislator.district}`,
          issueID: issueID,
          result: result,
          timestamp: new Date().toISOString()
        });
        
        // Save back to localStorage
        localStorage.setItem('completedCalls', JSON.stringify(completedCalls));
        
        // Increment user's personal call counter
        const userCalls = parseInt(localStorage.getItem('userTotalCalls') || '0') + 1;
        localStorage.setItem('userTotalCalls', userCalls.toString());
        
        // Report to server to increment global counter
        let globalCalls = parseInt(localStorage.getItem('globalCallCounter') || '0') + 1;
        
        try {
          // Use the same URL base as your other API calls
          const serverUrl = testing ? 'http://localhost:3000' : 'https://indianageneralassembly-production.up.railway.app';
          const response = await fetch(`${serverUrl}/api/calls/record`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              legislatorId: legislator.id || `${legislator.chamber}-${legislator.district}`,
              result: result,
              issueID: window.location.hash.substring(1)
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            globalCalls = data.globalCallCount;
            // Update localStorage with latest from server
            localStorage.setItem('globalCallCounter', globalCalls.toString());
          }
        } catch (error) {
          console.error('Error reporting call to server:', error);
          // Fallback: Just use the local counter if server unavailable
        }
        
        // Update the call stats display
        updateCallStatsDisplay(userCalls, globalCalls);
        
        // Apply highlight effect to show counter increase
        setTimeout(() => {
          const statValues = document.querySelectorAll('.call-stat-value');
          statValues.forEach(value => {
            value.classList.add('call-stat-highlight');
            
            // Remove class after animation completes
            setTimeout(() => {
              value.classList.remove('call-stat-highlight');
            }, 1000);
          });
        }, 100);
        
        console.log(`Call counters updated: user calls = ${userCalls}, global calls = ${globalCalls}`);
      }
      
      // Rest of your existing function...
    const legislators = [];
    const mySenator = localStorage.getItem('mySenator');
    const myHouseRep = localStorage.getItem('myHouseRep');
    
    if (mySenator) {
    try { legislators.push(JSON.parse(mySenator)); } catch (e) {}
    }
    
    if (myHouseRep) {
    try { legislators.push(JSON.parse(myHouseRep)); } catch (e) {}
    }
    
    // Get current index and calculate next
    let currentIndex = parseInt(localStorage.getItem('activeCallLegislatorIndex') || '0');
    let nextIndex = (currentIndex + 1) % legislators.length;
    
    // Save next index
    localStorage.setItem('activeCallLegislatorIndex', nextIndex.toString());
    
    // Update the call tracking to show the next legislator
    updateCallTracking();

    const nextLegislator = legislators[nextIndex];
    if (nextLegislator) {
    updateCallScriptText(nextLegislator);
    }
    
    // Scroll to script
    const scriptContainer = document.querySelector('.script-container');
    if (scriptContainer) {
    scriptContainer.scrollIntoView({ behavior: 'smooth' });
    }
    } catch (error) {
      console.error('Error recording call result:', error);
    }
}
  

function updateCallProgress(completedCalls, legislators) {
    // Find the progress elements
    const progressHeader = document.querySelector('.tracking-progress');
    if (!progressHeader) return;
    
    // Calculate remaining calls
    const totalCalls = legislators.length;
    const remainingCalls = totalCalls - completedCalls.length;
    
    // Update progress text
    const progressText = progressHeader.querySelector('.calls-remaining, .calls-complete');
    if (progressText) {
        if (remainingCalls > 0) {
            progressText.className = 'calls-remaining';
            progressText.textContent = `${remainingCalls} call${remainingCalls !== 1 ? 's' : ''} remaining`;
        } else {
            progressText.className = 'calls-complete';
            progressText.textContent = 'All calls completed!';
        }
    }
    
    // Update progress bar
    const progressBar = progressHeader.querySelector('.progress-fill');
    if (progressBar) {
        progressBar.style.width = `${(completedCalls.length / totalCalls) * 100}%`;
    }
    
    // Show/hide all done message if needed
    const currentCallInfo = document.querySelector('.current-call-info');
    const callResults = document.querySelector('.call-results');
    const allDoneMessage = document.querySelector('.all-calls-complete');
    
    if (remainingCalls === 0) {
        // Show completion message
        if (!allDoneMessage) {
            const trackingSection = document.querySelector('.call-tracking');
            if (trackingSection) {
                // Hide current call info and results
                if (currentCallInfo) currentCallInfo.style.display = 'none';
                if (callResults) callResults.style.display = 'none';
                
                // Create and show all done message
                const newAllDoneMessage = document.createElement('div');
                newAllDoneMessage.className = 'all-calls-complete';
                newAllDoneMessage.innerHTML = `
                    <h4>All Calls Completed!</h4>
                    <p>Great job! You've reached out to all your representatives on this issue.</p>
                    <button class="reset-calls-btn">Reset Call Progress</button>
                `;
                
                trackingSection.appendChild(newAllDoneMessage);
                
                // Add reset button listener
                newAllDoneMessage.querySelector('.reset-calls-btn').addEventListener('click', function() {
                    localStorage.removeItem('completedCalls');
                    localStorage.setItem('activeCallLegislatorIndex', '0');
                    updateCallTracking();
                    updateCallScripts();
                });
            }
        }
    } else {
        // Hide completion message if it exists
        if (allDoneMessage) {
            allDoneMessage.style.display = 'none';
        }
        
        // Show current call info and results
        if (currentCallInfo) currentCallInfo.style.display = 'block';
        if (callResults) callResults.style.display = 'block';
    }
}

// New function to update the call script text with a specific legislator
function updateCallScriptText(legislator) {
    if (!legislator) return;
    
    const scriptContent = document.querySelector('.script-content');
    if (!scriptContent) return;
    
    const paragraphs = scriptContent.querySelectorAll('p');
    if (paragraphs.length === 0) return;
    
    // Format the legislator name
    const title = legislator.chamber === 'S' ? 'Sen.' : 'Rep.';
    let fullName = '';
    let lastName = '';
    
    if (legislator.firstName && legislator.lastName) {
        fullName = `${title} ${legislator.firstName} ${legislator.lastName}`;
        lastName = legislator.lastName;
    } else if (legislator.displayName) {
        fullName = `${title} ${legislator.displayName}`;
        // Try to extract last name from display name
        const nameParts = legislator.displayName.split(' ');
        lastName = nameParts[nameParts.length - 1] || 'Unknown';
    } else if (legislator.name) {
        fullName = `${title} ${legislator.name}`;
        // Try to extract last name from name
        const nameParts = legislator.name.split(' ');
        lastName = nameParts[nameParts.length - 1] || 'Unknown';
    } else {
        fullName = `${title} [Name unavailable]`;
        lastName = 'Unknown';
    }
    
    // Get phone number using our helper function
    const phone = getLegislatorPhone(legislator);
    
    console.log(`Updating call script for next legislator: ${fullName} (${phone})`);
    
    // Update each paragraph with the new legislator name and phone
    paragraphs.forEach(paragraph => {
        let content = paragraph.innerHTML;
        let updatedContent = content;
        
        // Define placeholder patterns for names
        const namePatterns = [
            { pattern: /\[REP\/SEN NAME\]/g, chamber: 'both' },
            { pattern: /\[REP \/ SEN NAME\]/g, chamber: 'both' },
            { pattern: /\[REP\/SEN[\s]+NAME\]/g, chamber: 'both' },
            { pattern: /\[REP[\s]+\/[\s]+SEN[\s]+NAME\]/g, chamber: 'both' },
            { pattern: /\[SEN NAME\]/g, chamber: 'S' },
            { pattern: /\[REP NAME\]/g, chamber: 'H' }
        ];
        
        // Define placeholder patterns for phone numbers
        const phonePatterns = [
            { pattern: /\[PHONE\]/g, chamber: 'both' },
            { pattern: /\[PHONE NUMBER\]/g, chamber: 'both' },
            { pattern: /\[REP\/SEN PHONE\]/g, chamber: 'both' },
            { pattern: /\[SEN PHONE\]/g, chamber: 'S' },
            { pattern: /\[REP PHONE\]/g, chamber: 'H' }
        ];
        
        // Also replace any existing legislator name from the previous legislator
        // First, get existing legislator names from localStorage
        const oldSenator = localStorage.getItem('mySenator');
        const oldHouseRep = localStorage.getItem('myHouseRep');
        
        if (oldSenator) {
            try {
                const senator = JSON.parse(oldSenator);
                if (senator && senator.chamber === 'S') {
                    const oldTitle = 'Sen.';
                    let oldName = '';
                    
                    if (senator.firstName && senator.lastName) {
                        oldName = `${oldTitle} ${senator.firstName} ${senator.lastName}`;
                    } else if (senator.displayName) {
                        oldName = `${oldTitle} ${senator.displayName}`;
                    } else if (senator.name) {
                        oldName = `${oldTitle} ${senator.name}`;
                    }
                    
                    // Replace old senator name if not the current legislator
                    if (oldName && legislator.chamber !== 'S') {
                        updatedContent = updatedContent.replace(new RegExp(oldName, 'g'), fullName);
                    }
                }
            } catch (e) {}
        }
        
        if (oldHouseRep) {
            try {
                const rep = JSON.parse(oldHouseRep);
                if (rep && rep.chamber === 'H') {
                    const oldTitle = 'Rep.';
                    let oldName = '';
                    
                    if (rep.firstName && rep.lastName) {
                        oldName = `${oldTitle} ${rep.firstName} ${rep.lastName}`;
                    } else if (rep.displayName) {
                        oldName = `${oldTitle} ${rep.displayName}`;
                    } else if (rep.name) {
                        oldName = `${oldTitle} ${rep.name}`;
                    }
                    
                    // Replace old rep name if not the current legislator
                    if (oldName && legislator.chamber !== 'H') {
                        updatedContent = updatedContent.replace(new RegExp(oldName, 'g'), fullName);
                    }
                }
            } catch (e) {}
        }
        
        // Also check for remaining name placeholders
        namePatterns.forEach(pattern => {
            if ((pattern.chamber === 'both' || pattern.chamber === legislator.chamber) && 
                pattern.pattern.test(updatedContent)) {
                
                // Replace the pattern with the legislator's name
                updatedContent = updatedContent.replace(pattern.pattern, fullName);
            }
        });
        
        // Check for phone number placeholders
        phonePatterns.forEach(pattern => {
            if ((pattern.chamber === 'both' || pattern.chamber === legislator.chamber) && 
                pattern.pattern.test(updatedContent)) {
                
                // Replace the pattern with the legislator's phone
                updatedContent = updatedContent.replace(pattern.pattern, phone);
            }
        });
        
        // Update paragraph content if changed
        if (updatedContent !== content) {
            paragraph.innerHTML = updatedContent;
        }
    });
    
    // Add or update the personalization notice
    const scriptContainer = document.querySelector('.script-container');
    if (scriptContainer) {
        // Check if notice already exists
        let notice = document.querySelector('.personalized-notice');
        if (!notice) {
            // Create new notice
            notice = document.createElement('div');
            notice.className = 'personalized-notice call';
            scriptContainer.insertBefore(notice, scriptContainer.firstChild);
        }
        
        // Update notice text with clickable phone number
        notice.innerHTML = `
            <strong>Your script has been personalized with your legislator's name.</strong>
        `;
    }
}

// Function to handle URL routing
function handleRouting() {
    // Parse the current URL to get the issue ID
    const path = window.location.pathname;
    const issueId = path.split('/').pop(); // Get the last segment of the URL path
    const hash = window.location.hash.substring(1);
    
    // Check if we need to reload for legislator changes
    const needsReload = sessionStorage.getItem('legislatorsJustUpdated');
    if (needsReload) {
        // Clear the flag so we don't enter a reload loop
        sessionStorage.removeItem('legislatorsJustUpdated');
        // Reload only if we're on the same page
        if (window.location.href === sessionStorage.getItem('lastPageBeforeUpdate')) {
            console.log('Legislators were just updated, reloading page to update scripts');
            // No need to call loadIssueContent since we're reloading
            return;
        }
    }
  
    if (hash) {
        loadIssueContent(hash);
        updateSelectedIssueVisibility(hash);
    } else {
        // If no issue ID in URL, load the first issue from the list
        const firstIssueItem = document.querySelector('.issue-item');
        if (firstIssueItem) {
            const firstIssueId = firstIssueItem.getAttribute('data-issue');
            // Update URL with the first issue ID without reloading the page
            updateURL(firstIssueId);
            loadIssueContent(firstIssueId);
        }
    }
}

function updateSelectedIssueVisibility(selectedIssueId) {
    // Remove active class from all issues
    document.querySelectorAll('.issue-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to the selected issue
    const selectedItem = document.querySelector(`.issue-item[data-issue="${selectedIssueId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
      
      // Optionally scroll the item into view if it's not visible
      selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
  
// Function to update the URL when an issue is selected
function updateURL(issueId) {
    // Use history.pushState to update the URL without reloading the page
    window.location.hash = issueId;
}
  
// Modify your existing issue click handler
function setupIssueClickHandlers() {
    document.querySelectorAll('.issue-item').forEach(item => {
      item.addEventListener('click', function() {
        const issueId = this.getAttribute('data-issue');
        
        // Update the URL
        updateURL(issueId);
        
        // Load the issue content
        loadIssueContent(issueId);
      });
    });
}
  
// Handle browser back/forward navigation
window.addEventListener('popstate', function(event) {
    // Get the issue ID from the URL after navigation
    const hash = window.location.hash.substring(1);
    
    if (hash) {
        loadIssueContent(hash);
        updateSelectedIssueVisibility(hash);
    }
});