// find-my-legislators.js

// Function to load and display legislators in the header
export function loadMyLegislators() {
    const houseRep = localStorage.getItem('myHouseRep');
    const senator = localStorage.getItem('mySenator');
    const infoContainer = document.getElementById('header-legislators-info');
    const findBtn = document.getElementById('find-my-legislators-btn');
    const partyColor = JSON.parse(houseRep).party === 'Republican' ? 'style=background:red;' : 'style=background:blue;';
    
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
            html += `<span class="legislator-name" ${partyColor}>Rep. ${rep.firstName} ${rep.lastName}</span>`;
        }
        
        if (senator) {
            const sen = JSON.parse(senator);
            html += `<span class="legislator-name" ${partyColor}>Sen. ${sen.firstName} ${sen.lastName}</span>
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
    
    // Create a single save button section
    const saveBtnContainer = document.createElement('div');
    saveBtnContainer.className = 'save-legislators-container';
    saveBtnContainer.style.marginTop = '20px';
    saveBtnContainer.style.textAlign = 'center';
    
    // Create the save button
    saveBtnContainer.innerHTML = `
        <button id="save-all-legislators" class="button">
            Save as My Legislators
        </button>
    `;
    
    // Add elements to the container
    resultsContainer.appendChild(legislatorsList);
    resultsContainer.appendChild(saveBtnContainer);
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

// Initialize legislators functionality
function initLegislators() {
    // Load saved legislators
    loadMyLegislators();
    
    // Set up button event listeners
    const findBtn = document.getElementById('find-my-legislators-btn');
    if (findBtn) {
        findBtn.addEventListener('click', showLegislatorFinder);
    }
}

// Set up the legislators functionality when the DOM is loaded
document.addEventListener('DOMContentLoaded', initLegislators);