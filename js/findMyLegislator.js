// find-my-legislators.js

// Function to load and display legislators in the header
export function loadMyLegislators() {
    const houseRep = localStorage.getItem('myHouseRep');
    const senator = localStorage.getItem('mySenator');
    const infoContainer = document.getElementById('header-legislators-info');
    const findBtn = document.getElementById('find-my-legislators-btn');
    let partyColor = '';
    
    if (!infoContainer || !findBtn) return;
    
    // Clear previous content
    infoContainer.innerHTML = '';
    
    // Check if we have saved legislators
    if (houseRep || senator) {
        let html = '';
        
        html += `<div class="legislators-label">
            <span class="your-legislators">Your legislators: </span>`;
        if (houseRep) {
            const rep = JSON.parse(houseRep);
            // partyColor = rep.party === 'Republican' ? 'style=background:#cc6767;' : 'style=background:#6a6aff;';

            html += `<span class="legislator-name">Rep. ${rep.firstName} ${rep.lastName}</span>`;
        }
        
        if (senator) {
            const sen = JSON.parse(senator);
            // partyColor = sen.party === 'Republican' ? 'style=background:#cc6767;' : 'style=background:#6a6aff;';

            html += `<span class="legislator-name">Sen. ${sen.firstName} ${sen.lastName}</span>
                </div>`;
        }
        
        infoContainer.innerHTML = html;
        
        // Update button text
        findBtn.textContent = 'Change My Legislators';
    } else {
        // No saved legislators
        infoContainer.innerHTML = '';
        
        // Update button text
        findBtn.textContent = 'Find My Legislators';
    }
    
    // Also update any call scripts with legislator names
    updateCallScripts();
}

// Function to update call scripts with legislator names
function updateCallScripts() {
    const scripts = document.querySelectorAll('.script-content');
    if (!scripts.length) return;
    
    const houseRep = localStorage.getItem('myHouseRep');
    const senator = localStorage.getItem('mySenator');
    
    scripts.forEach(script => {
        const scriptText = script.innerHTML;
        let updatedText = scriptText;
        
        // Replace [Rep./Sen. Name] with actual names if found
        if (houseRep || senator) {
            const rep = houseRep ? JSON.parse(houseRep) : null;
            const sen = senator ? JSON.parse(senator) : null;
            
            if (rep) {
                updatedText = updatedText.replace(/\[Rep\.\s*Name\]/g, `Rep. ${rep.firstName} ${rep.lastName}`);
            }
            
            if (sen) {
                updatedText = updatedText.replace(/\[Sen\.\s*Name\]/g, `Sen. ${sen.firstName} ${sen.lastName}`);
            }
            
            // General replacement for [Representative Name] or [Senator Name]
            if (rep) {
                updatedText = updatedText.replace(/\[Representative Name\]/g, `Rep. ${rep.firstName} ${rep.lastName}`);
            }
            
            if (sen) {
                updatedText = updatedText.replace(/\[Senator Name\]/g, `Sen. ${sen.firstName} ${sen.lastName}`);
            }
        }
        
        script.innerHTML = updatedText;
    });
}

// Function to clear saved legislators
export function clearMyLegislators() {
    localStorage.removeItem('myHouseRep');
    localStorage.removeItem('mySenator');
    loadMyLegislators();
}

// Function to show the finder modal
export function showLegislatorFinder() {
    // Create or show the finder modal
    let finderModal = document.getElementById('legislator-finder-modal');
    
    if (!finderModal) {
        // Create the modal if it doesn't exist
        finderModal = document.createElement('div');
        finderModal.id = 'legislator-finder-modal';
        finderModal.className = 'modal';
        finderModal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Find Your Legislators</h2>
                <div class="finder-form">
                    <div class="form-group">
                        <label for="street">Street Address</label>
                        <input type="text" id="street" class="input" placeholder="123 Main St" required>
                    </div>
                    <div class="form-group">
                        <label for="city">City</label>
                        <input type="text" id="city" class="input" placeholder="Indianapolis" required>
                    </div>
                    <div class="form-group">
                        <label for="zip">ZIP Code</label>
                        <input type="text" id="zip" class="input" placeholder="46204">
                    </div>
                    <button id="search-legislators-btn" class="button">Search</button>
                </div>
                <div id="finder-loading" class="loading hidden">Searching for your legislators...</div>
                <div id="finder-error" class="error-message hidden"></div>
                <div id="finder-results" class="finder-results hidden"></div>
            </div>
        `;
        document.body.appendChild(finderModal);
        
        // Add event listeners for the new modal
        const closeBtn = finderModal.querySelector('.close-modal');
        closeBtn.addEventListener('click', function() {
            finderModal.style.display = 'none';
        });
        
        const searchBtn = document.getElementById('search-legislators-btn');
        searchBtn.addEventListener('click', searchLegislators);
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === finderModal) {
                finderModal.style.display = 'none';
            }
        });
    }
    
    // Show the modal
    finderModal.style.display = 'block';
}

// Function to search for legislators
async function searchLegislators() {
    const street = document.getElementById('street').value.trim();
    const city = document.getElementById('city').value.trim();
    const zip = document.getElementById('zip').value.trim();
    
    const resultsContainer = document.getElementById('finder-results');
    const loadingElement = document.getElementById('finder-loading');
    const errorElement = document.getElementById('finder-error');
    
    if (!resultsContainer || !loadingElement || !errorElement) return;
    
    // Validate inputs
    if (!street || !city) {
        errorElement.textContent = 'Please enter your street address and city.';
        errorElement.classList.remove('hidden');
        return;
    }
    
    // Show loading, hide results and errors
    loadingElement.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    errorElement.classList.add('hidden');
    
    try {
        // URL encode the address components
        const encodedStreet = encodeURIComponent(street);
        const encodedCity = encodeURIComponent(city);
        const encodedZip = encodeURIComponent(zip || '');
        
        // Get the API URL (assuming the same as in your bill tracker)
        const apiUrl = 'https://indianageneralassembly-production.up.railway.app';
        const year = new Date().getFullYear();
        
        const response = await fetch(
            `${apiUrl}/${year}/address/legislators?street=${encodedStreet}&city=${encodedCity}&zip=${encodedZip}`
        );
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        displayLegislatorResults(data);
    } catch (error) {
        console.error('Error finding legislators:', error);
        
        // Show specific error message
        if (error.message.includes('404')) {
            errorElement.textContent = 'We couldn\'t find legislative districts for this address. Please verify your address and try again.';
        } else if (error.message.includes('500')) {
            errorElement.textContent = 'Server error while looking up your legislators. Please try again later.';
        } else {
            errorElement.textContent = 'Unable to find legislators for this address. Please check your address and try again.';
        }
        
        errorElement.classList.remove('hidden');
    } finally {
        loadingElement.classList.add('hidden');
    }
}

// Function to display search results and add one-click save button
function displayLegislatorResults(response) {
    const resultsContainer = document.getElementById('finder-results');
    if (!resultsContainer) return;
    
    resultsContainer.innerHTML = '';
    
    const foundLegislators = Array.isArray(response) ? response : (response.items || []);
    
    if (!foundLegislators || foundLegislators.length === 0) {
        resultsContainer.innerHTML = '<p>No legislators found for this address.</p>';
        resultsContainer.classList.remove('hidden');
        return;
    }
    
    // Create header for results
    const header = document.createElement('h3');
    header.textContent = 'Your Legislators';
    header.className = 'results-title';
    resultsContainer.appendChild(header);
    
    // Add district information if available
    if (response.houseDistrict || response.senateDistrict) {
        const districtInfo = document.createElement('div');
        districtInfo.className = 'district-info';
        districtInfo.innerHTML = `
            <p>Your address is in the following districts:</p>
            <ul>
                ${response.houseDistrict ? `<li>House District ${response.houseDistrict}</li>` : ''}
                ${response.senateDistrict ? `<li>Senate District ${response.senateDistrict}</li>` : ''}
            </ul>
        `;
        resultsContainer.appendChild(districtInfo);
    }
    
    // Create a list for the legislators
    const legislatorsList = document.createElement('div');
    legislatorsList.className = 'legislators-list';
    
    // Group legislators by chamber
    const houseRep = foundLegislators.find(leg => leg.chamber === 'H');
    const senator = foundLegislators.find(leg => leg.chamber === 'S');
    
    // Add found legislators to the display
    if (houseRep) {
        const legislatorCard = document.createElement('div');
        legislatorCard.className = 'legislator-card';
        
        legislatorCard.innerHTML = `
            <div class="legislator-info">
                <h4>Rep. ${houseRep.firstName} ${houseRep.lastName}</h4>
                <p>House District ${houseRep.district}</p>
                <p>Party: ${houseRep.party}</p>
            </div>
        `;
        
        legislatorsList.appendChild(legislatorCard);
    }
    
    if (senator) {
        const legislatorCard = document.createElement('div');
        legislatorCard.className = 'legislator-card';
        
        legislatorCard.innerHTML = `
            <div class="legislator-info">
                <h4>Sen. ${senator.firstName} ${senator.lastName}</h4>
                <p>Senate District ${senator.district}</p>
                <p>Party: ${senator.party}</p>
            </div>
        `;
        
        legislatorsList.appendChild(legislatorCard);
    }
    
    // Add elements to the container
    resultsContainer.appendChild(legislatorsList);
    
    // Check if we're on the bill tracker page
    const isBillTracker = window.location.pathname.includes('/bill-tracker/');
    
    // Create buttons container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'legislators-actions-container';
    btnContainer.style.marginTop = '20px';
    btnContainer.style.textAlign = 'center';
    
    // Create the save button
    btnContainer.innerHTML = `
        <button id="save-all-legislators" class="button">
            Save as My Legislators
        </button>
    `;
    
    // Add view bills button if we're on the bill tracker page
    if (isBillTracker) {
        // Prepare legislator names for search
        let legislatorNames = [];
        if (houseRep) {
            legislatorNames.push(`${houseRep.firstName}-${houseRep.lastName}`);
        }
        if (senator) {
            legislatorNames.push(`${senator.firstName}-${senator.lastName}`);
        }
        
        // Create search button if we have legislators
        if (legislatorNames.length > 0) {
            const currentYear = new Date().getFullYear();
            const searchUrl = `/bill-tracker/?legislators=${legislatorNames.join(',')}&year=${currentYear}&view=bills`;
            
            btnContainer.innerHTML += `
                <button id="view-legislator-bills" class="button" style="margin-left: 10px;">
                    Save and View Their Bills
                </button>
            `;
            
            // Add the buttons container
            resultsContainer.appendChild(btnContainer);
            
            // Add event listener once the button is added to the DOM
            setTimeout(() => {
                document.getElementById('view-legislator-bills').addEventListener('click', function() {
                    // Save legislators first
                    try {
                        // Save both legislators
                        if (houseRep) {
                            localStorage.setItem('myHouseRep', JSON.stringify(houseRep));
                        }
                        
                        if (senator) {
                            localStorage.setItem('mySenator', JSON.stringify(senator));
                        }
                        
                        // Navigate to the bills view
                        window.location.href = searchUrl;
                    } catch (error) {
                        console.error('Error saving legislators before viewing bills:', error);
                        // Continue to the bills view even if saving fails
                        window.location.href = searchUrl;
                    }
                });
            }, 0);
        }
    } else {
        // If not on bill tracker, just add the save button container
        resultsContainer.appendChild(btnContainer);
    }
    
    resultsContainer.classList.remove('hidden');
    
    // Add event listener to the save button
    document.getElementById('save-all-legislators').addEventListener('click', function() {
        try {
            // Save both legislators
            if (houseRep) {
                localStorage.setItem('myHouseRep', JSON.stringify(houseRep));
            }
            
            if (senator) {
                localStorage.setItem('mySenator', JSON.stringify(senator));
            }
            
            // Update the display
            loadMyLegislators();
            
            // Close the modal
            const modal = document.getElementById('legislator-finder-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            // Show success message
            console.log('Your legislators have been saved!');

            setTimeout(function() {
                console.log('Reloading page to update scripts with legislator info');
                window.location.reload();
            }, 300);
        } catch (error) {
            console.error('Error saving legislators:', error);
            alert('Failed to save legislators. Please try again.');
        }
    });
}

// Function to update legislators in the footer
function updateFooterLegislators() {
    const houseRep = localStorage.getItem('myHouseRep');
    const senator = localStorage.getItem('mySenator');
    const footerContainer = document.getElementById('footer-legislators-info');
    let party = '';
    
    if (!footerContainer) return;
    
    // Clear previous content
    footerContainer.innerHTML = '';
    
    // Check if we have saved legislators
    if (houseRep || senator) {
        let html = '';
        
        // We don't include "Your legislators:" text since it's already in the heading
        html += `<div class="legislators-label">`;
        
        if (houseRep) {
            const rep = JSON.parse(houseRep);
            party = rep.party === 'Republican' ? 'R' : 'D';

            html += `<span class="legislator-name">Rep. ${rep.firstName} ${rep.lastName} (${party})</span>`;
        }
        
        if (senator) {
            const sen = JSON.parse(senator);
            party = sen.party === 'Republican' ? 'R' : 'D';

            html += `<span class="legislator-name">Sen. ${sen.firstName} ${sen.lastName} (${party})</span>`;
        }
        
        html += `</div>`;
        footerContainer.innerHTML = html;
    } else {
        // No saved legislators
        footerContainer.innerHTML = '<p>No legislators selected</p>';
    }
}

// Initialize legislators functionality
function initLegislators() {
    // Load saved legislators
    loadMyLegislators();

    updateFooterLegislators();
    
    // Set up button event listeners
    const findBtn = document.getElementById('find-my-legislators-btn');
    if (findBtn) {
        findBtn.addEventListener('click', showLegislatorFinder);
    }
}

// Set up the legislators functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', initLegislators);