import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "./findMyLegislator.js";
import { baseUrl } from "./const.js";

const testing = false;
const year = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', async function() {

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


    const wasReset = checkForDailyReset();
    

    loadIssuesData();
    handleRouting();
    await initializeCallStats();
    

    const findBtn = document.getElementById('find-my-legislators-btn');
    if (findBtn) {
        findBtn.addEventListener('click', showLegislatorFinder);
    }
    
    const clearBtn = document.getElementById('clear-my-legislators-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearMyLegislators);
    }
    

    loadMyLegislators();
    

    document.addEventListener('legislatorsLoaded', updateCallScripts);
    

    if (wasReset) {
        setTimeout(() => {
            updateCallTracking();
        }, 1000);
    }
});


function checkForDailyReset() {

    const lastResetDate = localStorage.getItem('lastCallProgressReset');
    

    const today = new Date().toISOString().split('T')[0];
    

    if (!lastResetDate || lastResetDate !== today) {

        

        localStorage.removeItem('completedCalls');
        localStorage.setItem('activeCallLegislatorIndex', '0');
        

        localStorage.setItem('lastCallProgressReset', today);
        
        return true;
    }
    
    return false;
}


async function loadIssuesData() {
    try {

        const response = await fetch('bills/index.json');
        if (!response.ok) throw new Error(`Failed to load issues index: ${response.status}`);
        
        const issuesData = await response.json();
        

        createIssuesSidebar(issuesData.issues);
        



            




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


function createIssuesSidebar(issues) {
    const sidebarList = document.querySelector('.issues-list');
    if (!sidebarList) return;
    

    sidebarList.innerHTML = '';
    

    issues.forEach(issue => {
        const listItem = document.createElement('li');
        listItem.className = 'issue-item';
        listItem.setAttribute('data-issue', issue.id);
        listItem.textContent = issue.title;
        

        listItem.addEventListener('click', function() {

            document.querySelectorAll('.issue-item').forEach(item => {
                item.classList.remove('active');
            });
            

            this.classList.add('active');
            

            loadIssueContent(issue.id);
            

            if (window.innerWidth <= 768) {
                const contentArea = document.querySelector('.issues-content');
                contentArea.scrollIntoView({ behavior: 'smooth' });
            }
        });
        
        sidebarList.appendChild(listItem);
    });


    setupIssueClickHandlers();
    

    handleRouting();
}



async function loadIssueContent(issueId) {
    const contentContainer = document.querySelector('.issues-content');
    if (!contentContainer) return;
    

    contentContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <div class="loading-text">Loading content...</div>
        </div>
    `;
    
    try {
        
        if (issueId === 'how-to') {

            const guideResponse = await fetch('bills/how-to.md');
            if (!guideResponse.ok) throw new Error(`Failed to load guide: ${guideResponse.status}`);
            

            const guideMarkdown = await guideResponse.text();
            

            const parsedGuide = marked.parse(guideMarkdown);
            

            contentContainer.innerHTML = `
                <div class="issue-detail active issues-guide">
                    ${parsedGuide}
                </div>
            `;
            return; 
        }


        const response = await fetch(`bills/${issueId}.md`);
        if (!response.ok) throw new Error(`Failed to load issue content: ${response.status}`);
        
        const markdownContent = await response.text();
        
        const parsedContent = marked.parse(markdownContent);
        
        contentContainer.innerHTML = `
            <div class="issue-detail active">
                ${parsedContent}
            </div>
        `;
        
        processRenderedContent();
        
        updateCallScripts();
        
        updateCallTracking();
        
    } catch (error) {
        console.error(`Error loading issue ${issueId}:`, error);
    }
}

function processRenderedContent() {
    const issueDetail = document.querySelector('.issue-detail');
    if (!issueDetail) return;
    
    const sectionHeadings = issueDetail.querySelectorAll('h2');
    
    sectionHeadings.forEach(heading => {
        let sectionContent = [];
        let currentElement = heading.nextElementSibling;
        
        while (currentElement && currentElement.tagName !== 'H2') {
            sectionContent.push(currentElement.outerHTML);
            currentElement = currentElement.nextElementSibling;
        }
        
        const section = document.createElement('div');
        
        if (heading.textContent.toLowerCase().includes('description')) {
            section.className = 'issue-description';
        } else if (heading.textContent.toLowerCase().includes('related bills') || 
                   heading.textContent.toLowerCase().includes('bills')) {
            section.className = 'related-bills';
            section.innerHTML = '<h3>Related Bills</h3>';
        } else if (heading.textContent.toLowerCase().includes('call script')) {
            section.className = 'call-script';
            section.innerHTML = `
                <h3>Contact Script</h3>
                <div class="script-container">
                    <p class="script-intro">When contacting your representative about this bill, consider using the following script:</p>
                    <p class="script-tip"><strong>Tip:</strong> These bills have passed from one chamber to the next. If you are told the issue you are calling about is in the other chamber, let the person know your legislator may not currently have a vote, but they do have a voice. You can also mention that you are calling both your House Rep. and Senator.</p>
                    <p class="script-tip"><strong>Tip:</strong> Be yourself. Adding personal stories can help show how this bill impacts your community. 
                    Be respectful. The person you talk to is more likely to be an assistant than the Representative or Senator themselves.</p>
                    <div class="script-content"></div>
                </div>
            `;
        }
        
        if (section.className === 'call-script') {
            section.querySelector('.script-content').innerHTML = sectionContent.join('');
        } else {
            section.innerHTML += sectionContent.join('');
        }
        
        let elementToRemove = heading;
        while (elementToRemove && elementToRemove !== currentElement) {
            const nextElement = elementToRemove.nextElementSibling;
            elementToRemove.remove();
            elementToRemove = nextElement;
        }
        
        if (currentElement) {
            issueDetail.insertBefore(section, currentElement);
        } else {
            issueDetail.appendChild(section);
        }
    });
    
    const billsSection = issueDetail.querySelector('.related-bills');
    if (billsSection) {
        const billHeadings = billsSection.querySelectorAll('h3:not(:first-child)');
        
        billHeadings.forEach(heading => {
            const billItem = document.createElement('div');
            billItem.className = 'bill-item';
            
            const titleDiv = document.createElement('div');
            titleDiv.className = 'bill-title';
            titleDiv.textContent = heading.textContent;
            
            if (titleDiv.textContent.includes('[Passed]')) {
                const statusTag = document.createElement('span');
                statusTag.className = 'bill-status status-passed';
                statusTag.textContent = 'Passed';
                titleDiv.appendChild(statusTag);
                
                titleDiv.textContent = titleDiv.textContent.replace('[Passed]', '');
            } else if (titleDiv.textContent.includes('[In Progress]')) {
                const statusTag = document.createElement('span');
                statusTag.className = 'bill-status status-progress';
                statusTag.textContent = 'In Progress';
                titleDiv.appendChild(statusTag);
                
                titleDiv.textContent = titleDiv.textContent.replace('[In Progress]', '');
            }
            
            billItem.appendChild(titleDiv);
            
            const description = heading.nextElementSibling;
            if (description && description.tagName === 'P') {
                const descDiv = document.createElement('div');
                descDiv.className = 'bill-description';
                descDiv.textContent = description.textContent;
                billItem.appendChild(descDiv);
                
                description.remove();
            }
            
            heading.replaceWith(billItem);
        });
    }
}

function getLegislatorPhone(legislator) {
    if (legislator.phone) {
        return legislator.phone;
    }
    
    if (legislator.officePhone) {
        return legislator.officePhone;
    }
    
    if (legislator.chamber === 'S') {
        return '800-382-9467';
    } else {
        return '800-382-9841';
    }
}

function updateCallScripts() {


    const mySenator = localStorage.getItem('mySenator');
    const myHouseRep = localStorage.getItem('myHouseRep');
    




    
    const scriptContainer = document.querySelector('.script-container');
    if (!scriptContainer) {

        return;
    }
    
    if (!mySenator && !myHouseRep) {

        
        const existingNotice = document.querySelector('.legislator-notice');
        if (!existingNotice) {
            const notice = document.createElement('div');
            notice.className = 'personalized-notice legislator-notice';
            notice.innerHTML = `
                <strong>To show your legislator's contact information:</strong>
                <button id="script-find-legislators-btn" class="button small-button">Find My Legislators</button>
            `;
            
            scriptContainer.insertBefore(notice, scriptContainer.firstChild);
            
            document.getElementById('script-find-legislators-btn').addEventListener('click', showLegislatorFinder);
        }
        
        return;
    }
    
    const existingFindNotice = document.querySelector('.legislator-notice');
    if (existingFindNotice) {
        existingFindNotice.remove();
    }
    
    try {
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

            return;
        }
        

        
        const activeLegIndex = parseInt(localStorage.getItem('activeCallLegislatorIndex') || '0');
        const activeLegislator = legislators[activeLegIndex < legislators.length ? activeLegIndex : 0];
        
        const paragraphs = scriptContainer.querySelectorAll('p');
        let anyUpdates = false;
        

        
        paragraphs.forEach((paragraph, index) => {
            let content = paragraph.innerHTML;
            let updatedContent = content;
            

            
            if (activeLegislator) {
                const title = activeLegislator.chamber === 'S' ? 'Sen.' : 'Rep.';
                const phone = getLegislatorPhone(activeLegislator);
                
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
                

                
                const namePatterns = [
                    { pattern: /\[REP\/SEN NAME\]/g, chamber: 'both' },
                    { pattern: /\[REP \/ SEN NAME\]/g, chamber: 'both' },
                    { pattern: /\[REP\/SEN[\s]+NAME\]/g, chamber: 'both' },
                    { pattern: /\[REP[\s]+\/[\s]+SEN[\s]+NAME\]/g, chamber: 'both' },
                    { pattern: /\[SEN NAME\]/g, chamber: 'S' },
                    { pattern: /\[REP NAME\]/g, chamber: 'H' }
                ];
                
                const phonePatterns = [
                    { pattern: /\[PHONE\]/g, chamber: 'both' },
                    { pattern: /\[PHONE NUMBER\]/g, chamber: 'both' },
                    { pattern: /\[REP\/SEN PHONE\]/g, chamber: 'both' },
                    { pattern: /\[SEN PHONE\]/g, chamber: 'S' },
                    { pattern: /\[REP PHONE\]/g, chamber: 'H' }
                ];
                
                namePatterns.forEach(pattern => {
                    if ((pattern.chamber === 'both' || pattern.chamber === activeLegislator.chamber) && 
                        pattern.pattern.test(updatedContent)) {

                        updatedContent = updatedContent.replace(pattern.pattern, fullName);
                    }
                });
                
                phonePatterns.forEach(pattern => {
                    if ((pattern.chamber === 'both' || pattern.chamber === activeLegislator.chamber) && 
                        pattern.pattern.test(updatedContent)) {

                        
                        updatedContent = updatedContent.replace(pattern.pattern, phone);
                    }
                });
            }
            

            if (updatedContent !== content) {



                paragraph.innerHTML = updatedContent;
                anyUpdates = true;
            }
        });
        


        const title = activeLegislator.chamber === 'S' ? 'Sen.' : 'Rep.';
        const phone = getLegislatorPhone(activeLegislator);
        

        let lastName = '';
        let fullName = '';
        
        if (activeLegislator.firstName && activeLegislator.lastName) {
            fullName = `${title} ${activeLegislator.firstName} ${activeLegislator.lastName}`;
            lastName = activeLegislator.lastName;
        } else if (activeLegislator.displayName) {
            fullName = `${title} ${activeLegislator.displayName}`;

            const nameParts = activeLegislator.displayName.split(' ');
            lastName = nameParts[nameParts.length - 1] || 'Unknown';
        } else if (activeLegislator.name) {
            fullName = `${title} ${activeLegislator.name}`;

            const nameParts = activeLegislator.name.split(' ');
            lastName = nameParts[nameParts.length - 1] || 'Unknown';
        } else {
            fullName = `${title} [Name unavailable]`;
            lastName = 'Unknown';
        }

        const activeIndex = parseInt(localStorage.getItem('activeCallLegislatorIndex') || '0');

        let nextLegislatorIndex = (activeIndex + 1) % legislators.length;
        let nextLegislator = legislators[nextLegislatorIndex];
        let nextLegislatorName = 'your next legislator';

        if (nextLegislator) {
            const nextTitle = nextLegislator.chamber === 'S' ? 'Sen.' : 'Rep.';
            

            if (nextLegislator.firstName && nextLegislator.lastName) {
                nextLegislatorName = `${nextTitle} ${nextLegislator.firstName} ${nextLegislator.lastName}`;
            } else if (nextLegislator.displayName) {
                nextLegislatorName = `${nextTitle} ${nextLegislator.displayName}`;
            } else if (nextLegislator.name) {
                nextLegislatorName = `${nextTitle} ${nextLegislator.name}`;
            } else {
                nextLegislatorName = `${nextTitle} [Name unavailable]`;
            }
        }
        


        let existingNotice = document.querySelector('.personalized-notice');
        
        if (!existingNotice) {

            existingNotice = document.createElement('div');
            existingNotice.className = 'personalized-notice call';
            

            scriptContainer.insertBefore(existingNotice, scriptContainer.firstChild);
        }
        

        existingNotice.innerHTML = `
            <strong>Your legislators are: ${fullName} & ${nextLegislatorName}</strong>
            <div id="header-legislators-action" class="header-legislators-action">
                <button id="find-my-legislators-btn" class="button small-button">Change My Legislators</button>
            </div>
        `;
        
    } catch (error) {
        console.error('Error updating call scripts:', error);
    }
}

function getLegislatorEmail(legislator) {


    if (legislator && legislator.chamber && legislator.district) {
        const chamberCode = legislator.chamber.toLowerCase();
        return `${chamberCode}${legislator.district}@iga.in.gov`;
    }
    

    return 'contact@iga.in.gov';
}

function updateCallTracking() {

    

    const mySenator = localStorage.getItem('mySenator');
    const myHouseRep = localStorage.getItem('myHouseRep');
    

    if (!mySenator && !myHouseRep) {

        return;
    }
    

    const scriptContainer = document.querySelector('.script-container');
    if (!scriptContainer) {

        return;
    }
    

    if (document.querySelector('.call-tracking')) {

        document.querySelector('.call-tracking').remove();
    }
    
    try {

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

            return;
        }
        

        let activeIndex = parseInt(localStorage.getItem('activeCallLegislatorIndex') || '0');
        if (activeIndex >= legislators.length) activeIndex = 0;
        

        const completedCalls = JSON.parse(localStorage.getItem('completedCalls') || '[]');
        

        const trackingSection = document.createElement('div');
        trackingSection.className = 'call-tracking';
        

        const progressHeader = document.createElement('div');
        progressHeader.className = 'tracking-progress';
        

        const totalCalls = legislators.length;
        const remainingCalls = totalCalls - completedCalls.length;
        
        progressHeader.innerHTML = `
            <div class="tracking-header">
                <h4>Daily Contact Progress</h4>
                ${remainingCalls > 0 ? 
                    `<span class="calls-remaining">${remainingCalls} Legislator${remainingCalls !== 1 ? 's' : ''} Remaining</span>` : 
                    '<span class="calls-complete">All calls completed!</span>'}
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(completedCalls.length / totalCalls) * 100}%"></div>
            </div>
            <p class="script-tip"><strong>Tip:</strong> Email your legislators! Click the email to open your preferred email provider, use the 'Copy Script' button and paste the contact script into the body of your email (fill in your name and address), and set your subject line (I like to use the issue name). All of this below ↓</p>

        `;
        
        trackingSection.appendChild(progressHeader);
        

        if (remainingCalls > 0) {
            const activeLegislator = legislators[activeIndex];
            const title = activeLegislator.chamber === 'S' ? 'Senator' : 'Representative';
            

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
            

            const phone = getLegislatorPhone(activeLegislator);
            
            let issueTitle = "Current Issue";
            const issueTitleElement = document.querySelector('.issue-detail h1');
            if (issueTitleElement) {
                issueTitle = issueTitleElement.textContent;
            } else {

                const activeIssueItem = document.querySelector('.issue-item.active');
                if (activeIssueItem) {
                    issueTitle = activeIssueItem.textContent;
                } else {

                    const issueId = window.location.hash.substring(1);
                    if (issueId) {

                        issueTitle = issueId.toUpperCase().replace(/([a-z]+)(\d+)/i, '$1 $2');
                    }
                }
            }


            const currentCallInfo = document.createElement('div');
            currentCallInfo.className = 'current-call-info';
            currentCallInfo.innerHTML = `
                <h4>Current Contact: ${title} ${fullName}</h4>
                <p><strong>${issueTitle}</strong></p>
                <p class="legislator-phone"><strong>Phone:</strong> <a href="tel:${phone.replace(/\D/g, '')}">${phone}</a></p>
                <p class="legislator-email"><strong>Email:</strong>
                    <button class="email-button" onclick="window.location.href='mailto:${getLegislatorEmail(activeLegislator)}'">
                         ${getLegislatorEmail(activeLegislator)}
                    </button>
                </p>
                <p>District: ${activeLegislator.district || 'N/A'}</p>
                <p>Party: ${activeLegislator.party || 'N/A'}</p>
            `;
            
            trackingSection.appendChild(currentCallInfo);
            
            let nextLegislatorIndex = (activeIndex + 1) % legislators.length;
            let nextLegislator = legislators[nextLegislatorIndex];
            let nextLegislatorName = 'your next legislator';

            if (nextLegislator) {
                const nextTitle = nextLegislator.chamber === 'S' ? 'Sen.' : 'Rep.';
                

                if (nextLegislator.firstName && nextLegislator.lastName) {
                    nextLegislatorName = `${nextTitle} ${nextLegislator.firstName} ${nextLegislator.lastName}`;
                } else if (nextLegislator.displayName) {
                    nextLegislatorName = `${nextTitle} ${nextLegislator.displayName}`;
                } else if (nextLegislator.name) {
                    nextLegislatorName = `${nextTitle} ${nextLegislator.name}`;
                } else {
                    nextLegislatorName = `${nextTitle} [Name unavailable]`;
                }
            }


            const callResults = document.createElement('div');
            callResults.className = 'call-results';
            callResults.innerHTML = `
                <p class="result-prompt"><strong>After contacting ${title === 'Senator' ? 'Sen.' : 'Rep.'} ${fullName}, share the result to show ${nextLegislatorName}'s information:</strong></p>
                <div class="result-buttons">
                    <button class="result-btn" data-result="unavailable">Unavailable</button>
                    <button class="result-btn" data-result="voicemail">Left Voicemail</button>
                    <button class="result-btn" data-result="contacted">Made Contact</button>
                    <button class="result-btn" data-result="emailed">Sent Email</button>
                    <button class="result-btn" data-result="skip">Skip</button>
                </div>
            `;
            
            trackingSection.appendChild(callResults);
            

            trackingSection.querySelectorAll('.result-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const result = this.getAttribute('data-result');
                    recordCallResult(activeLegislator, result);
                });
            });
        } else {

            const allDoneMessage = document.createElement('div');
            allDoneMessage.className = 'all-calls-complete';
            allDoneMessage.innerHTML = `
                <h4>All Calls Completed!</h4>
                <p>Great job! You've reached out to all your representatives on this issue.</p>
                <button class="reset-calls-btn">Reset Call Progress</button>
            `;
            
            trackingSection.appendChild(allDoneMessage);
            

            trackingSection.querySelector('.reset-calls-btn').addEventListener('click', function() {
                localStorage.removeItem('completedCalls');
                localStorage.setItem('activeCallLegislatorIndex', '0');
                updateCallTracking();
                updateCallScripts();
            });
        }
        

        scriptContainer.parentNode.insertBefore(trackingSection, scriptContainer.nextSibling);
        
    } catch (error) {
        console.error('Error setting up call tracking:', error);
    }
}


async function initializeCallStats() {

    const userCallCount = parseInt(localStorage.getItem('userTotalCalls') || '0');
    

    let globalCallCount = 0;
    try {

      const response = await fetch(`${baseUrl}/api/calls/count`);
      if (response.ok) {
        const data = await response.json();
        globalCallCount = data.globalCallCount;
      }
    } catch (error) {
      console.error('Error fetching global call count:', error);

      globalCallCount = parseInt(localStorage.getItem('globalCallCounter') || '0');
    }
    

    updateCallStatsDisplay(userCallCount, globalCallCount);
    

}
  

function updateCallStatsDisplay(userCalls, globalCalls) {

    const scriptContainer = document.querySelector('.script-container');
    if (!scriptContainer) return;
    

    let statsContainer = document.querySelector('.call-stats-container');
    
    if (!statsContainer) {

      statsContainer = document.createElement('div');
      statsContainer.className = 'call-stats-container';
      

      const scriptIntro = scriptContainer.querySelector('.script-intro');
      if (scriptIntro) {
        scriptIntro.parentNode.insertBefore(statsContainer, scriptIntro.nextSibling);
      } else {

        scriptContainer.insertBefore(statsContainer, scriptContainer.firstChild);
      }
    }
    













}
  
async function recordCallResult(legislator, result) {

    
    try {

      checkForDailyReset();
      

      const completedCalls = JSON.parse(localStorage.getItem('completedCalls') || '[]');
      const issueID = window.location.hash.substring(1);
      

      if (result !== 'skip') {
        completedCalls.push({
          legislatorId: legislator.id || `${legislator.chamber}-${legislator.district}`,
          issueID: issueID,
          result: result,
          timestamp: new Date().toISOString()
        });
        

        localStorage.setItem('completedCalls', JSON.stringify(completedCalls));
        

        const userCalls = parseInt(localStorage.getItem('userTotalCalls') || '0') + 1;
        localStorage.setItem('userTotalCalls', userCalls.toString());
        

        let globalCalls = parseInt(localStorage.getItem('globalCallCounter') || '0') + 1;
        
        try {

          const response = await fetch(`${baseUrl}/api/calls/record`, {
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

            localStorage.setItem('globalCallCounter', globalCalls.toString());
          }
        } catch (error) {
          console.error('Error reporting call to server:', error);

        }
        

        updateCallStatsDisplay(userCalls, globalCalls);
        

        setTimeout(() => {
          const statValues = document.querySelectorAll('.call-stat-value');
          statValues.forEach(value => {
            value.classList.add('call-stat-highlight');
            

            setTimeout(() => {
              value.classList.remove('call-stat-highlight');
            }, 1000);
          });
        }, 100);
        

      }
      

    const legislators = [];
    const mySenator = localStorage.getItem('mySenator');
    const myHouseRep = localStorage.getItem('myHouseRep');
    
    if (mySenator) {
    try { legislators.push(JSON.parse(mySenator)); } catch (e) {}
    }
    
    if (myHouseRep) {
    try { legislators.push(JSON.parse(myHouseRep)); } catch (e) {}
    }
    

    let currentIndex = parseInt(localStorage.getItem('activeCallLegislatorIndex') || '0');
    let nextIndex = (currentIndex + 1) % legislators.length;
    

    localStorage.setItem('activeCallLegislatorIndex', nextIndex.toString());
    

    updateCallTracking();

    const nextLegislator = legislators[nextIndex];
    if (nextLegislator) {
    updateCallScriptText(nextLegislator);
    }
    

    const scriptContainer = document.querySelector('.script-container');
    if (scriptContainer) {
    scriptContainer.scrollIntoView({ behavior: 'smooth' });
    }
    } catch (error) {
      console.error('Error recording call result:', error);
    }
}
  

function updateCallProgress(completedCalls, legislators) {

    const progressHeader = document.querySelector('.tracking-progress');
    if (!progressHeader) return;
    

    const totalCalls = legislators.length;
    const remainingCalls = totalCalls - completedCalls.length;
    

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
    

    const progressBar = progressHeader.querySelector('.progress-fill');
    if (progressBar) {
        progressBar.style.width = `${(completedCalls.length / totalCalls) * 100}%`;
    }
    

    const currentCallInfo = document.querySelector('.current-call-info');
    const callResults = document.querySelector('.call-results');
    const allDoneMessage = document.querySelector('.all-calls-complete');
    
    if (remainingCalls === 0) {

        if (!allDoneMessage) {
            const trackingSection = document.querySelector('.call-tracking');
            if (trackingSection) {

                if (currentCallInfo) currentCallInfo.style.display = 'none';
                if (callResults) callResults.style.display = 'none';
                

                const newAllDoneMessage = document.createElement('div');
                newAllDoneMessage.className = 'all-calls-complete';
                newAllDoneMessage.innerHTML = `
                    <h4>All Calls Completed!</h4>
                    <p>Great job! You've reached out to all your representatives on this issue.</p>
                    <button class="reset-calls-btn">Reset Call Progress</button>
                `;
                
                trackingSection.appendChild(newAllDoneMessage);
                

                newAllDoneMessage.querySelector('.reset-calls-btn').addEventListener('click', function() {
                    localStorage.removeItem('completedCalls');
                    localStorage.setItem('activeCallLegislatorIndex', '0');
                    updateCallTracking();
                    updateCallScripts();
                });
            }
        }
    } else {

        if (allDoneMessage) {
            allDoneMessage.style.display = 'none';
        }
        

        if (currentCallInfo) currentCallInfo.style.display = 'block';
        if (callResults) callResults.style.display = 'block';
    }
}


function updateCallScriptText(legislator) {
    if (!legislator) return;
    
    const scriptContent = document.querySelector('.script-content');
    if (!scriptContent) return;
    
    const paragraphs = scriptContent.querySelectorAll('p');
    if (paragraphs.length === 0) return;
    

    const title = legislator.chamber === 'S' ? 'Sen.' : 'Rep.';
    let fullName = '';
    let lastName = '';
    
    if (legislator.firstName && legislator.lastName) {
        fullName = `${title} ${legislator.firstName} ${legislator.lastName}`;
        lastName = legislator.lastName;
    } else if (legislator.displayName) {
        fullName = `${title} ${legislator.displayName}`;

        const nameParts = legislator.displayName.split(' ');
        lastName = nameParts[nameParts.length - 1] || 'Unknown';
    } else if (legislator.name) {
        fullName = `${title} ${legislator.name}`;

        const nameParts = legislator.name.split(' ');
        lastName = nameParts[nameParts.length - 1] || 'Unknown';
    } else {
        fullName = `${title} [Name unavailable]`;
        lastName = 'Unknown';
    }
    

    const phone = getLegislatorPhone(legislator);
    

    

    paragraphs.forEach(paragraph => {
        let content = paragraph.innerHTML;
        let updatedContent = content;
        

        const namePatterns = [
            { pattern: /\[REP\/SEN NAME\]/g, chamber: 'both' },
            { pattern: /\[REP \/ SEN NAME\]/g, chamber: 'both' },
            { pattern: /\[REP\/SEN[\s]+NAME\]/g, chamber: 'both' },
            { pattern: /\[REP[\s]+\/[\s]+SEN[\s]+NAME\]/g, chamber: 'both' },
            { pattern: /\[SEN NAME\]/g, chamber: 'S' },
            { pattern: /\[REP NAME\]/g, chamber: 'H' }
        ];
        

        const phonePatterns = [
            { pattern: /\[PHONE\]/g, chamber: 'both' },
            { pattern: /\[PHONE NUMBER\]/g, chamber: 'both' },
            { pattern: /\[REP\/SEN PHONE\]/g, chamber: 'both' },
            { pattern: /\[SEN PHONE\]/g, chamber: 'S' },
            { pattern: /\[REP PHONE\]/g, chamber: 'H' }
        ];
        


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
                    

                    if (oldName && legislator.chamber !== 'H') {
                        updatedContent = updatedContent.replace(new RegExp(oldName, 'g'), fullName);
                    }
                }
            } catch (e) {}
        }
        

        namePatterns.forEach(pattern => {
            if ((pattern.chamber === 'both' || pattern.chamber === legislator.chamber) && 
                pattern.pattern.test(updatedContent)) {
                

                updatedContent = updatedContent.replace(pattern.pattern, fullName);
            }
        });
        

        phonePatterns.forEach(pattern => {
            if ((pattern.chamber === 'both' || pattern.chamber === legislator.chamber) && 
                pattern.pattern.test(updatedContent)) {
                

                updatedContent = updatedContent.replace(pattern.pattern, phone);
            }
        });
        

        if (updatedContent !== content) {
            paragraph.innerHTML = updatedContent;
        }
    });
    

    const scriptContainer = document.querySelector('.script-container');
    if (scriptContainer) {

        let notice = document.querySelector('.personalized-notice');
        if (!notice) {

            notice = document.createElement('div');
            notice.className = 'personalized-notice call';
            scriptContainer.insertBefore(notice, scriptContainer.firstChild);
        }
        

        notice.innerHTML = `
            <strong>Your script has been personalized with your legislator's name and phone number.</strong>
        `;
    }
}


function handleRouting() {

    const path = window.location.pathname;
    const issueId = path.split('/').pop();
    const hash = window.location.hash.substring(1);
    

    const needsReload = sessionStorage.getItem('legislatorsJustUpdated');
    if (needsReload) {

        sessionStorage.removeItem('legislatorsJustUpdated');

        if (window.location.href === sessionStorage.getItem('lastPageBeforeUpdate')) {


            return;
        }
    }
  
    if (hash) {
        loadIssueContent(hash);
        updateSelectedIssueVisibility(hash);
    } else {

        const firstIssueItem = document.querySelector('.issue-item');
        if (firstIssueItem) {
            const firstIssueId = firstIssueItem.getAttribute('data-issue');

            updateURL(firstIssueId);
            loadIssueContent(firstIssueId);
        }
    }
}

function updateSelectedIssueVisibility(selectedIssueId) {

    document.querySelectorAll('.issue-item').forEach(item => {
      item.classList.remove('active');
    });
    

    const selectedItem = document.querySelector(`.issue-item[data-issue="${selectedIssueId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
      

      selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
  

function updateURL(issueId) {

    window.location.hash = issueId;
}
  

function setupIssueClickHandlers() {
    document.querySelectorAll('.issue-item').forEach(item => {
      item.addEventListener('click', function() {
        const issueId = this.getAttribute('data-issue');
        

        updateURL(issueId);
        

        loadIssueContent(issueId);
      });
    });
}
  

window.addEventListener('popstate', function(event) {

    const hash = window.location.hash.substring(1);
    
    if (hash) {
        loadIssueContent(hash);
        updateSelectedIssueVisibility(hash);
    }
});


function enhanceUpdateCallTracking() {

    const originalUpdateCallTracking = updateCallTracking;
    

    window.updateCallTracking = function() {

      originalUpdateCallTracking.apply(this, arguments);
      

      setTimeout(addCopyButtonNextToEmail, 100);
    };
  }


function addCopyButtonNextToEmail() {

    const emailParagraph = document.querySelector('.legislator-email');
    if (!emailParagraph) {
      console.log('Email paragraph not found');
      return;
    }
    

    if (emailParagraph.querySelector('.copy-script-btn')) {
      console.log('Copy button already exists');
      return;
    }
    
    console.log('Adding copy button to email paragraph');
    

    const copyButton = document.createElement('button');
    copyButton.className = 'copy-script-btn';
    copyButton.id = 'copy-script-button'; 
    copyButton.textContent = 'Copy Script';
    

    const successMessage = document.createElement('span');
    successMessage.className = 'copy-success';
    successMessage.id = 'copy-success-message'; 
    successMessage.textContent = 'Copied!';
    successMessage.style.display = 'none'; 
    

    emailParagraph.appendChild(copyButton);
    emailParagraph.appendChild(successMessage);
    

    copyButton.addEventListener('click', function() {

      const scriptContent = document.querySelector('.script-content');
      if (!scriptContent) {
        console.log('Script content not found');
        return;
      }
      

      const paragraphs = scriptContent.querySelectorAll('p');
      let textToCopy = '';
      
      paragraphs.forEach(paragraph => {

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = paragraph.innerHTML;
        textToCopy += tempDiv.textContent + '\n\n';
      });
      

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
          .then(() => {
            console.log('Text copied to clipboard successfully');

            successMessage.style.display = 'inline';
            

            setTimeout(() => {
              successMessage.style.display = 'none';
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy text: ', err);

            fallbackCopyTextToClipboard(textToCopy);
          });
      } else {

        fallbackCopyTextToClipboard(textToCopy);
      }
      
      function fallbackCopyTextToClipboard(text) {

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        

        textarea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            console.log('Fallback: Text copied to clipboard');

            successMessage.style.display = 'inline';
            

            setTimeout(() => {
              successMessage.style.display = 'none';
            }, 2000);
          } else {
            console.error('Fallback: Unable to copy');
          }
        } catch (err) {
          console.error('Fallback: Error copying text: ', err);
        }
        

        document.body.removeChild(textarea);
      }
    });
  }
  

  function setupCopyButtonHooks() {

    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {

        if (mutation.addedNodes.length) {

          const emailParagraph = document.querySelector('.legislator-email');
          if (emailParagraph && !emailParagraph.querySelector('.copy-script-btn')) {
            console.log('Detected email paragraph update, adding copy button');
            addCopyButtonNextToEmail();
          }
        }
      });
    });
    

    observer.observe(document.body, { childList: true, subtree: true });
    

    setTimeout(addCopyButtonNextToEmail, 500);
    setTimeout(addCopyButtonNextToEmail, 1500);
    

    if (typeof window.recordCallResult === 'function') {
      const originalRecordCallResult = window.recordCallResult;
      
      window.recordCallResult = function(legislator, result) {
        console.log('Intercepted recordCallResult call');
        

        const callResult = originalRecordCallResult.apply(this, arguments);
        


        setTimeout(addCopyButtonNextToEmail, 100);
        setTimeout(addCopyButtonNextToEmail, 500);
        setTimeout(addCopyButtonNextToEmail, 1000);
        
        return callResult;
      };
      
      console.log('Successfully hooked into recordCallResult function');
    }
    

    if (typeof window.updateCallTracking === 'function') {
      const originalUpdateCallTracking = window.updateCallTracking;
      
      window.updateCallTracking = function() {

        const result = originalUpdateCallTracking.apply(this, arguments);
        

        setTimeout(addCopyButtonNextToEmail, 100);
        setTimeout(addCopyButtonNextToEmail, 500);
        
        return result;
      };
      
      console.log('Successfully hooked into updateCallTracking function');
    } else {
      console.warn('Could not hook into updateCallTracking function');
    }
  }
  

  if (typeof window.updateCallScriptText === 'function') {
    const originalUpdateCallScriptText = window.updateCallScriptText;
    
    window.updateCallScriptText = function(legislator) {
      console.log('Intercepted updateCallScriptText call');
      

      const result = originalUpdateCallScriptText.apply(this, arguments);
      

      setTimeout(addCopyButtonNextToEmail, 100);
      setTimeout(addCopyButtonNextToEmail, 300);
      
      return result;
    };
    
    console.log('Successfully hooked into updateCallScriptText function');
  } else {
    console.warn('Could not hook into updateCallScriptText function');
  }
  

document.addEventListener('DOMContentLoaded', function() {

    const skipButtonObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          const skipButton = document.querySelector('.result-btn[data-result="skip"]');
          if (skipButton && !skipButton._hasSkipHandler) {
            console.log('Found skip button, adding special handler');
            


            skipButton._hasSkipHandler = true;
            

            skipButton.addEventListener('click', function(event) {
              console.log('Skip button clicked - ensuring copy button persists');
              

              

              const emailParagraph = document.querySelector('.legislator-email');
              if (emailParagraph) {
                console.log('Found email paragraph before transition');
                

                for (let i = 1; i <= 10; i++) {
                  setTimeout(function() {
                    const newEmailParagraph = document.querySelector('.legislator-email');
                    if (newEmailParagraph && !newEmailParagraph.querySelector('.copy-script-btn')) {
                      console.log(`Attempt ${i}: Adding copy button after skip`);
                      

                      const copyButton = document.createElement('button');
                      copyButton.className = 'copy-script-btn';
                      copyButton.id = 'copy-script-button';
                      copyButton.textContent = 'Copy Script';
                      

                      const successMessage = document.createElement('span');
                      successMessage.className = 'copy-success';
                      successMessage.id = 'copy-success-message';
                      successMessage.textContent = 'Copied!';
                      successMessage.style.display = 'none';
                      

                      newEmailParagraph.appendChild(copyButton);
                      newEmailParagraph.appendChild(successMessage);
                      

                      copyButton.addEventListener('click', function() {

                        const scriptContent = document.querySelector('.script-content');
                        if (!scriptContent) {
                          console.log('Script content not found');
                          return;
                        }
                        

                        const paragraphs = scriptContent.querySelectorAll('p');
                        let textToCopy = '';
                        
                        paragraphs.forEach(paragraph => {
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = paragraph.innerHTML;
                          textToCopy += tempDiv.textContent + '\n\n';
                        });
                        

                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(textToCopy)
                            .then(() => {
                              successMessage.style.display = 'inline';
                              setTimeout(() => {
                                successMessage.style.display = 'none';
                              }, 2000);
                            })
                            .catch(err => {
                              console.error('Failed to copy text: ', err);
                            });
                        } else {

                          const textarea = document.createElement('textarea');
                          textarea.value = textToCopy;
                          textarea.style.position = 'fixed';
                          textarea.style.opacity = '0';
                          document.body.appendChild(textarea);
                          textarea.select();
                          
                          try {
                            document.execCommand('copy');
                            successMessage.style.display = 'inline';
                            setTimeout(() => {
                              successMessage.style.display = 'none';
                            }, 2000);
                          } catch (err) {
                            console.error('Fallback copy failed: ', err);
                          }
                          
                          document.body.removeChild(textarea);
                        }
                      });
                    }
                  }, i * 200);
                }
              }
            });
          }
        }
      });
    });
    
    skipButtonObserver.observe(document.body, { childList: true, subtree: true });
    

    setTimeout(function() {
      const skipButton = document.querySelector('.result-btn[data-result="skip"]');
      if (skipButton && !skipButton._hasSkipHandler) {
        console.log('Found existing skip button, adding handler');
        skipButton._hasSkipHandler = true;
        

        skipButton.addEventListener('click', function() {
          console.log('Existing skip button clicked');
          

          for (let i = 1; i <= 10; i++) {
            setTimeout(function() {
              const emailParagraph = document.querySelector('.legislator-email');
              if (emailParagraph && !emailParagraph.querySelector('.copy-script-btn')) {
                addCopyButtonAfterSkip(emailParagraph);
              }
            }, i * 200);
          }
        });
      }
    }, 1000);
  });
  
  

  if (typeof window.recordCallResult === 'function') {
    const originalRecordCallResult = window.recordCallResult;
    
    window.recordCallResult = function(legislator, result) {

      const isSkip = result === 'skip';
      if (isSkip) {
        console.log('recordCallResult with SKIP detected, ensuring copy button persists');
      }
      

      const returnValue = originalRecordCallResult.apply(this, arguments);
      

      if (isSkip) {

        for (let i = 1; i <= 15; i++) {
          setTimeout(function() {
            const emailParagraph = document.querySelector('.legislator-email');
            if (emailParagraph && !emailParagraph.querySelector('.copy-script-btn')) {
              console.log(`Extra attempt ${i} to add copy button after skip transition`);
              

              if (typeof window.addCopyButtonNextToEmail === 'function') {
                window.addCopyButtonNextToEmail();
              } else {

                const copyButton = document.createElement('button');
                copyButton.className = 'copy-script-btn';
                copyButton.textContent = 'Copy Script';
                emailParagraph.appendChild(copyButton);
                
                const successMessage = document.createElement('span');
                successMessage.className = 'copy-success';
                successMessage.textContent = 'Copied!';
                successMessage.style.display = 'none';
                emailParagraph.appendChild(successMessage);
              }
            }
          }, 300 * i);
        }
      }
      
      return returnValue;
    };
    
    console.log('Successfully patched recordCallResult specifically for skip handling');
  }


  function attachButtonListeners() {
    const resultButtons = document.querySelectorAll('.result-btn');
    if (resultButtons.length > 0) {
      console.log(`Found ${resultButtons.length} result buttons, attaching listeners`);
      
      resultButtons.forEach(button => {

        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        

        newButton.addEventListener('click', function(event) {
          console.log(`Result button clicked: ${this.getAttribute('data-result')}`);
          

          setTimeout(addCopyButtonNextToEmail, 200);
          setTimeout(addCopyButtonNextToEmail, 500);
          setTimeout(addCopyButtonNextToEmail, 800);
        }, true);
      });
    }
  }
  

  function watchForResultButtons() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {

          setTimeout(attachButtonListeners, 100);
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    

    setTimeout(attachButtonListeners, 500);
  }
  

  document.addEventListener('legislatorsLoaded', function() {
    console.log('Legislators loaded event detected');
    setTimeout(addCopyButtonNextToEmail, 500);
  });


  function enhanceUpdateCallScriptText() {

    const originalUpdateCallScriptText = updateCallScriptText;
    

    window.updateCallScriptText = function() {

      originalUpdateCallScriptText.apply(this, arguments);
      

      setTimeout(addCopyButtonNextToEmail, 100);
    };
  }
  

  document.addEventListener('DOMContentLoaded', function() {
    enhanceUpdateCallTracking();
    enhanceUpdateCallScriptText();
    

    setTimeout(addCopyButtonNextToEmail, 1000);
  });
  


  function updateCurrentCallInfoTemplate() {

    const originalUpdateCallTracking = updateCallTracking;
    
    window.updateCallTracking = function() {

      const args = arguments;
      

      const result = originalUpdateCallTracking.apply(this, args);
      

      const emailParagraph = document.querySelector('.legislator-email');
      if (emailParagraph && !emailParagraph.querySelector('.copy-script-btn')) {
        addCopyButtonNextToEmail();
      }
      
      return result;
    };
  }
  

  document.addEventListener('DOMContentLoaded', updateCurrentCallInfoTemplate);