import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "./findMyLegislator.js";
import { categories, data, inflationFactors, lineItemDescriptions, getCategoryColor } from "./budgetConst.js";

let showingInflationAdjusted = false;

// Helper functions
const inflationAdjustedData = data.map(yearData => {
  const year = yearData.year;
  const factor = inflationFactors[year] || 1;
  
  // Create a new object with the same year
  const adjustedYearData = { year: year };
  
  // Adjust all budget values by the inflation factor (dividing by the factor)
  Object.keys(yearData).forEach(key => {
    if (key !== 'year') {
      adjustedYearData[key] = yearData[key] / factor;
    }
  });
  
  return adjustedYearData;
});

function addInflationToggle() {
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'inflation-toggle-container';
  toggleContainer.innerHTML = `
    <label class="toggle-switch">
      <input type="checkbox" id="inflationToggle">
      <span class="toggle-slider"></span>
    </label>
    <span class="toggle-label">Adjust for inflation (2016 dollars)</span>
  `;
  
  // Insert the toggle before the category buttons
  const categoryButtonsContainer = document.getElementById('categoryButtons');
  categoryButtonsContainer.parentNode.insertBefore(toggleContainer, categoryButtonsContainer);
  
  // Add event listener for the toggle
  document.getElementById('inflationToggle').addEventListener('change', function() {
    showingInflationAdjusted = this.checked;
    updateDataSource();
    const selectedCategory = document.querySelector('.category-button.active').dataset.category;
    updateChart(selectedCategory);
    createLegend();
  });
}

function updateDataSource() {
  // Update the chart with the appropriate data
  chart.data.datasets.forEach(dataset => {
    const label = dataset.label;
    if (showingInflationAdjusted) {
      dataset.data = inflationAdjustedData.map(d => d[label]);
    } else {
      dataset.data = data.map(d => d[label]);
    }
  });
  
  chart.update();
}

const formatValue = (value) => {
if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}B`;
}
return `$${value.toFixed(0)}M`;
};

// Elements
const chartContainer = document.getElementById('chartCanvas');
const legendContainer = document.getElementById('legendContainer');
const categoryButtons = document.getElementById('categoryButtons');

// Chart instance
let chart;

// Event listeners
categoryButtons.addEventListener('click', (event) => {
if (event.target.classList.contains('category-button')) {
    const selectedCategory = event.target.dataset.category;
    updateChart(selectedCategory);
    updateActiveButton(selectedCategory);
}
});

// Initialize the chart
function initializeChart(selectedCategory) {
  const datasets = getDatasetsByCategory(selectedCategory);
  
  datasets.forEach(dataset => {
    dataset.borderWidth = 1;
    dataset.tension = 0.1;
    dataset.fill = false;
    dataset.pointRadius = 1.5;
    dataset.pointHoverRadius = 4;
  });

  chart = new Chart(chartContainer, {
    type: 'line',
    data: {
      labels: data.map(d => d.year),
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300
      },
      scales: {
        x: {
          type: 'category',
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            callback: function(value) {
              return formatValue(value);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          mode: 'nearest',
          intersect: false,
          callbacks: {
            label: (context) => {
              const item = context.dataset.label;
              const currentValue = context.parsed.y;
              
              // Use the correct data source for previous year comparison
              const dataSource = showingInflationAdjusted ? inflationAdjustedData : data;
              const previousYear = dataSource.find((d) => d.year === context.label - 1);
              const previousValue = previousYear ? previousYear[item] : null;
              const yearChange = previousValue
                ? ((currentValue - previousValue) / previousValue * 100).toFixed(1)
                : null;

              // Add inflation indicator if showing adjusted data
              const inflationIndicator = showingInflationAdjusted ? " (2016 dollars)" : "";
              
              let label = `${item}: ${formatValue(currentValue)}${inflationIndicator}`;
              if (yearChange) {
                label += ` (${yearChange}% change from previous year)`;
              }
              return label;
            }
          }
        },
        legend: {
          display: false
        }
      },
      hover: {
        mode: 'nearest',
        intersect: false,
        animationDuration: 150
      }
    }
  });
}
// Update the chart
function updateChart(selectedCategory) {
  const datasets = getDatasetsByCategory(selectedCategory);
  chart.data.datasets = datasets;
  resetDatasets();
  chart.update();
}

// Get datasets by category
function getDatasetsByCategory(selectedCategory) {
  let items;
  if (selectedCategory === 'all') {
    items = Object.keys(data[0]).filter((key) => key !== 'year');
  } else {
    items = categories[selectedCategory] || [];
  }

  const dataSource = showingInflationAdjusted ? inflationAdjustedData : data;
  
  const datasets = items.map((item) => ({
    label: item,
    data: dataSource.map((d) => d[item]),
    borderColor: getCategoryColor(item),
    backgroundColor: getCategoryColor(item),
    fill: false
  }));

  return datasets;
}

// Create category buttons
function createCategoryButtons() {
const allButton = document.createElement('button');
allButton.textContent = 'All Categories';
allButton.classList.add('category-button');
allButton.dataset.category = 'all';
categoryButtons.appendChild(allButton);

Object.keys(categories).forEach((category) => {
    const button = document.createElement('button');
    button.textContent = category;
    button.classList.add('category-button');
    button.dataset.category = category;
    categoryButtons.appendChild(button);
});
}

// Update active button
function updateActiveButton(selectedCategory) {
  const buttons = categoryButtons.querySelectorAll('.category-button');
  buttons.forEach((button) => {
    if (button.dataset.category === selectedCategory) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Reset highlighting
  resetDatasets();
  
  // Close expanded items
  document.querySelectorAll('.legend-item-entry.expanded').forEach(item => {
    item.classList.remove('expanded');
  });
}

// Create legend
// Add these new utility functions
function highlightDataset(label) {
  chart.data.datasets.forEach(dataset => {
    if (dataset.label === label) {
      dataset.borderWidth = 4;
      dataset.borderColor = getCategoryColor(label);
      dataset.backgroundColor = getCategoryColor(label);
      dataset.opacity = 1;
    } else {
      dataset.borderWidth = 2;
      dataset.borderColor = 'rgba(200, 200, 200, 0.3)';
      dataset.backgroundColor = 'rgba(200, 200, 200, 0.1)';
      dataset.opacity = 0.5;
    }
  });
  chart.update();
}

function resetDatasets() {
  chart.data.datasets.forEach(dataset => {
    dataset.borderWidth = 2;
    dataset.borderColor = getCategoryColor(dataset.label);
    dataset.backgroundColor = getCategoryColor(dataset.label);
    dataset.opacity = .8;
  });
  chart.update();
}

function calculateCategoryTotals(yearData) {
  const totals = {};
  
  Object.entries(categories).forEach(([category, items]) => {
    totals[category] = items.reduce((sum, item) => sum + (yearData[item] || 0), 0);
  });
  
  return totals;
}

// Modified createLegend function to add properly formatted totals
// Complete createLegend function with the missing functionality restored
function createLegend() {
  const legendContainer = document.getElementById('legendContainer');
  legendContainer.innerHTML = '';

  const leftColumn = document.createElement('div');
  leftColumn.classList.add('legend-item');

  const rightColumn = document.createElement('div');
  rightColumn.classList.add('legend-item');

  const rightColumnCategories = ['Health & Human Services', 'Public Safety'];
  const leftColumnCategories = Object.keys(categories).filter(cat => !rightColumnCategories.includes(cat));

  // Use the appropriate data source based on toggle state
  const dataSource = showingInflationAdjusted ? inflationAdjustedData : data;
  
  // Calculate totals for each year using the correct data source
  const yearTotals = {};
  dataSource.forEach(yearData => {
    yearTotals[yearData.year] = calculateCategoryTotals(yearData);
  });

  const createEntries = (items) => {
    return items
      .sort((a, b) => {
        const valueA = dataSource[dataSource.length - 1][a];
        const valueB = dataSource[dataSource.length - 1][b];
        return valueB - valueA;
      })
      .map(item => {
        const entry = document.createElement('div');
        entry.classList.add('legend-item-entry');
        
        const colorBox = document.createElement('div');
        colorBox.classList.add('legend-item-color');
        colorBox.style.backgroundColor = getCategoryColor(item);
        entry.appendChild(colorBox);

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('legend-item-content');

        const mainLine = document.createElement('div');
        mainLine.classList.add('legend-item-main');

        const label = document.createElement('div');
        label.classList.add('legend-item-label');
        label.textContent = item;
        mainLine.appendChild(label);

        // Use 2025 (index 9) and the last year for comparison
        const yearArray = dataSource[9]; // 2025 
        const startValue = yearArray[item];
        const endValue = dataSource[dataSource.length - 1][item]; 
        const growth = ((endValue - startValue) / startValue * 100).toFixed(1);

        const value = document.createElement('div');
        value.classList.add('legend-item-value');
        const firstYear = yearArray.year; 
        const lastYear = dataSource[dataSource.length - 1].year;
        
        // Add inflation indicator if showing adjusted data
        const valueText = formatValue(endValue);
        const inflationIndicator = showingInflationAdjusted ? " (2016 dollars)" : "";
        
        value.textContent = `FY ${lastYear}: ${valueText}${inflationIndicator} (${growth}% since FY ${firstYear})`;
        mainLine.appendChild(value);

        contentWrapper.appendChild(mainLine);

        // Add descriptions if available
        if (lineItemDescriptions[item]) {
          const description = document.createElement('div');
          description.classList.add('legend-item-description');
          
          const descText = document.createElement('div');
          descText.classList.add('description-text');
          descText.textContent = lineItemDescriptions[item].description;
          description.appendChild(descText);

          const examples = document.createElement('div');
          examples.classList.add('description-examples');
          examples.textContent = `Examples: ${lineItemDescriptions[item].examples}`;
          description.appendChild(examples);

          contentWrapper.appendChild(description);

          // Add click handler
          entry.addEventListener('click', () => {
            const wasExpanded = entry.classList.contains('expanded');
            
            // Reset all entries
            document.querySelectorAll('.legend-item-entry.expanded').forEach(item => {
              if (item !== entry) {
                item.classList.remove('expanded');
              }
            });
            
            // Toggle current entry
            entry.classList.toggle('expanded', !wasExpanded);
            
            // Update chart highlighting
            if (!wasExpanded) {
              highlightDataset(item);
            } else {
              resetDatasets();
            }
          });
        }

        entry.appendChild(contentWrapper);
        return entry;
      });
  };

  // Create left column with category totals
  leftColumnCategories.forEach(category => {
    const categorySection = document.createElement('div');
    categorySection.classList.add('legend-group');

    const titleContainer = document.createElement('div');
    titleContainer.classList.add('legend-group-header');

    // Category name on first line
    const titleName = document.createElement('div');
    titleName.classList.add('legend-group-title-name');
    titleName.textContent = category;
    titleContainer.appendChild(titleName);
    
    // Budget info on second line
    const titleInfo = document.createElement('div');
    titleInfo.classList.add('legend-group-title-info');
    
    // Get the total for the first (2025) and last (2027*) years from the correct data source
    const firstYear = dataSource[9].year; // 2025
    const lastYear = dataSource[dataSource.length - 1].year; // 2027*
    
    const startTotal = yearTotals[firstYear][category];
    const endTotal = yearTotals[lastYear][category];
    const growth = ((endTotal - startTotal) / startTotal * 100).toFixed(1);
    
    // Add inflation indicator if showing adjusted data
    const inflationIndicator = showingInflationAdjusted ? " (2016 dollars)" : "";
    titleInfo.textContent = `FY ${lastYear}: ${formatValue(endTotal)}${inflationIndicator} (${growth}% since FY ${firstYear})`;
    
    titleContainer.appendChild(titleInfo);
    categorySection.appendChild(titleContainer);

    // Add individual entries using the correct data source
    createEntries(categories[category]).forEach(entry => categorySection.appendChild(entry));
    leftColumn.appendChild(categorySection);
  });

  // Create right column with category totals (same approach)
  rightColumnCategories.forEach(category => {
    const categorySection = document.createElement('div');
    categorySection.classList.add('legend-group');

    const titleContainer = document.createElement('div');
    titleContainer.classList.add('legend-group-header');

    // Category name on first line
    const titleName = document.createElement('div');
    titleName.classList.add('legend-group-title-name');
    titleName.textContent = category;
    titleContainer.appendChild(titleName);
    
    // Budget info on second line
    const titleInfo = document.createElement('div');
    titleInfo.classList.add('legend-group-title-info');
    
    // Get the total for the first (2025) and last (2027*) years from the correct data source
    const firstYear = dataSource[9].year; // 2025
    const lastYear = dataSource[dataSource.length - 1].year; // 2027*
    
    const startTotal = yearTotals[firstYear][category];
    const endTotal = yearTotals[lastYear][category];
    const growth = ((endTotal - startTotal) / startTotal * 100).toFixed(1);
    
    // Add inflation indicator if showing adjusted data
    const inflationIndicator = showingInflationAdjusted ? " (2016 dollars)" : "";
    titleInfo.textContent = `FY ${lastYear}: ${formatValue(endTotal)}${inflationIndicator} (${growth}% since FY ${firstYear})`;
    
    titleContainer.appendChild(titleInfo);
    categorySection.appendChild(titleContainer);

    // Add individual entries using the correct data source
    createEntries(categories[category]).forEach(entry => categorySection.appendChild(entry));
    rightColumn.appendChild(categorySection);
  });

  legendContainer.appendChild(leftColumn);
  legendContainer.appendChild(rightColumn);
}

document.addEventListener('DOMContentLoaded', () => {
  // Highlight active nav link based on current page
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

// Initialize the app
function initialize() {
  addInflationToggle();
  createCategoryButtons();
  createLegend();
  initializeChart('all');
  updateActiveButton('all');

  // Add event listeners
  document.getElementById('categoryButtons').addEventListener('click', (event) => {
    if (event.target.classList.contains('category-button')) {
      const selectedCategory = event.target.dataset.category;
      updateChart(selectedCategory);
      updateActiveButton(selectedCategory);
    }
  });
}

initialize();