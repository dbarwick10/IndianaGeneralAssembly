import { showLegislatorFinder, clearMyLegislators, loadMyLegislators } from "../findMyLegislator.js";

let showingInflationAdjusted = false;

const categories = {
    'Education': [
      'Tuition Support', 
      'Other Higher Education',
      'Teacher Retirement',
      'State Student Assistance', 
      'Education Administration', 
      'Other Local Schools',
      'Other Education'
    ],
    'Health & Human Services': [
      'Medicaid',
      'Mental Health and Addictions', 
      'Family Resources',
      'Aging Services',
      'Disability and Rehabilitative Services', 
      'Department of Child Services', 
      'Public Health',
      'Other Health and Human Services', 
      'FSSA Administration'
    ],
    'Public Safety': [
      'Corrections', 
      'Other Public Safety'
    ],
    'Administration & Development': [
      'General Government',
      'Economic Development',
      'Transportation',
      'Conservation and Environment',
      'Distributions'
    ]
};

const data = [
    {
      year: 2016,
      'General Government': 574.9,
      'Corrections': 719.4,
      'Other Public Safety': 258.0,
      'Conservation and Environment': 77.2,
      'Economic Development': 72.7,
      'Transportation': 43.0,
      'FSSA Administration': 64.2,
      'Medicaid': 2027.2,
      'Mental Health and Addictions': 259.6,
      'Family Resources': 131.2,
      'Aging Services': 63.5,
      'Disability and Rehabilitative Services': 121.2,
      'Department of Child Services': 554.1,
      'Public Health': 32.6,
      'Other Health and Human Services': 31.5,
      'State Student Assistance': 363.4,
      'Other Higher Education': 1520.9,
      'Education Administration': 22.4,
      'Tuition Support': 6849.7,
      'Other Local Schools': 227.9,
      'Teacher Retirement': 836.8,
      'Other Education': 7.8,
      'Distributions': 261.4
    },
    {
      year: 2017,
      'General Government': 575.7,
      'Corrections': 719.9,
      'Other Public Safety': 250.9,
      'Conservation and Environment': 75.2,
      'Economic Development': 72.0,
      'Transportation': 44.0,
      'FSSA Administration': 63.7,
      'Medicaid': 2241.9,
      'Mental Health and Addictions': 270.0,
      'Family Resources': 131.1,
      'Aging Services': 63.5,
      'Disability and Rehabilitative Services': 121.1,
      'Department of Child Services': 554.3,
      'Public Health': 31.8,
      'Other Health and Human Services': 31.3,
      'State Student Assistance': 349.2,
      'Other Higher Education': 1552.4,
      'Education Administration': 21.9,
      'Tuition Support': 7017.4,
      'Other Local Schools': 233.4,
      'Teacher Retirement': 841.0,
      'Other Education': 7.7,
      'Distributions': 253.6
    },
    {
      year: 2018,
      'General Government': 621.1,
      'Corrections': 736.6,
      'Other Public Safety': 266.0,
      'Conservation and Environment': 79.9,
      'Economic Development': 97.6,
      'Transportation': 47.0,
      'FSSA Administration': 16.6,
      'Medicaid': 2106.6,
      'Mental Health and Addictions': 270.8,
      'Family Resources': 131.1,
      'Aging Services': 61.2,
      'Disability and Rehabilitative Services': 120.3,
      'Department of Child Services': 629.3,
      'Public Health': 31.8,
      'Other Health and Human Services': 91.5,
      'State Student Assistance': 354.0,
      'Other Higher Education': 1581.3,
      'Education Administration': 34.7,
      'Tuition Support': 7075.6,
      'Other Local Schools': 211.4,
      'Teacher Retirement': 887.9,
      'Other Education': 8.4,
      'Distributions': 66.3
  },
  {
      year: 2019,
      'General Government': 621.8,
      'Corrections': 739.4,
      'Other Public Safety': 281.7,
      'Conservation and Environment': 82.0,
      'Economic Development': 117.3,
      'Transportation': 48.0,
      'FSSA Administration': 16.6,
      'Medicaid': 2364.4,
      'Mental Health and Addictions': 275.6,
      'Family Resources': 131.1,
      'Aging Services': 61.2,
      'Disability and Rehabilitative Services': 120.3,
      'Department of Child Services': 679.3,
      'Public Health': 31.8,
      'Other Health and Human Services': 91.5,
      'State Student Assistance': 338.8,
      'Other Higher Education': 1623.2,
      'Education Administration': 39.8,
      'Tuition Support': 7198.6,
      'Other Local Schools': 214.7,
      'Teacher Retirement': 913.9,
      'Other Education': 8.4,
      'Distributions': 66.3
      },
    {
      year: 2020,
      'General Government': 642.2,
      'Corrections': 758.8,
      'Other Public Safety': 317.4,
      'Conservation and Environment': 83.6,
      'Economic Development': 124.8,
      'Transportation': 47.0,
      'FSSA Administration': 16.1,
      'Medicaid': 2568.7,
      'Mental Health and Addictions': 278.5,
      'Family Resources': 128.6,
      'Aging Services': 59.5,
      'Disability and Rehabilitative Services': 42.8,
      'Department of Child Services': 910.2,
      'Public Health': 29.6,
      'Other Health and Human Services': 89.6,
      'State Student Assistance': 378.9,
      'Other Higher Education': 1626.1,
      'Education Administration': 40.5,
      'Tuition Support': 7371.8,
      'Other Local Schools': 240.8,
      'Teacher Retirement': 919.0,
      'Other Education': 11.4,
      'Distributions': 60.2
    },
    {
      year: 2021,
      'General Government': 617.3,
      'Corrections': 761.8,
      'Other Public Safety': 317.7,
      'Conservation and Environment': 84.1,
      'Economic Development': 123.8,
      'Transportation': 47.0,
      'FSSA Administration': 16.1,
      'Medicaid': 2702.2,
      'Mental Health and Addictions': 277.7,
      'Family Resources': 128.6,
      'Aging Services': 59.5,
      'Disability and Rehabilitative Services': 42.8,
      'Department of Child Services': 900.2,
      'Public Health': 29.6,
      'Other Health and Human Services': 89.4,
      'State Student Assistance': 392.6,
      'Other Higher Education': 1673.9,
      'Education Administration': 40.5,
      'Tuition Support': 7554.7,
      'Other Local Schools': 237.3,
      'Teacher Retirement': 946.6,
      'Other Education': 11.4,
      'Distributions': 60.2
    },
    {
      year: 2022,
      'General Government': 628.8,
      'Corrections': 825.2,
      'Other Public Safety': 316.3,
      'Conservation and Environment': 82.5,
      'Economic Development': 149.4,
      'Transportation': 45.0,
      'FSSA Administration': 14.9,
      'Medicaid': 2707.4,
      'Mental Health and Addictions': 293.4,
      'Family Resources': 128.0,
      'Aging Services': 59.2,
      'Disability and Rehabilitative Services': 41.4,
      'Department of Child Services': 885.6,
      'Public Health': 9.7,
      'Other Health and Human Services': 83.9,
      'State Student Assistance': 382.4,
      'Other Higher Education': 1664.2,
      'Education Administration': 43.4,
      'Tuition Support': 7900.3,
      'Other Local Schools': 225.0,
      'Teacher Retirement': 975.0,
      'Other Education': 10.6,
      'Distributions': 60.4
    },
    {
      year: 2023,
      'General Government': 686.9,
      'Corrections': 830.6,
      'Other Public Safety': 320.4,
      'Conservation and Environment': 83.2,
      'Economic Development': 148.8,
      'Transportation': 45.0,
      'FSSA Administration': 14.9,
      'Medicaid': 3059.6,
      'Mental Health and Addictions': 292.7,
      'Family Resources': 128.0,
      'Aging Services': 59.2,
      'Disability and Rehabilitative Services': 41.4,
      'Department of Child Services': 885.6,
      'Public Health': 9.7,
      'Other Health and Human Services': 83.9,
      'State Student Assistance': 382.4,
      'Other Higher Education': 1685.3,
      'Education Administration': 44.0,
      'Tuition Support': 8240.3,
      'Other Local Schools': 235.9,
      'Teacher Retirement': 1005.0,
      'Other Education': 10.6,
      'Distributions': 60.4
    },
    {
      year: 2024,
      'General Government': 860.5,
      'Corrections': 931.4,
      'Other Public Safety': 450.6,
      'Conservation and Environment': 120.0,
      'Economic Development': 247.7,
      'Transportation': 45.0,
      'FSSA Administration': 20.0,
      'Medicaid': 3903.6,
      'Mental Health and Addictions': 358.2,
      'Family Resources': 154.6,
      'Aging Services': 61.8,
      'Disability and Rehabilitative Services': 57.7,
      'Department of Child Services': 976.9,
      'Public Health': 109.9,
      'Other Health and Human Services': 97.4,
      'State Student Assistance': 400.5,
      'Other Higher Education': 1768.3,
      'Education Administration': 168.9,
      'Tuition Support': 8884.5,
      'Other Local Schools': 314.8,
      'Teacher Retirement': 1035.2,
      'Other Education': 15.4,
      'Distributions': 50.5
    },
    {
      year: 2025,
      'General Government': 875.6,
      'Corrections': 937.6,
      'Other Public Safety': 453.5,
      'Conservation and Environment': 120.8,
      'Economic Development': 222.4,
      'Transportation': 45.0,
      'FSSA Administration': 20.0,
      'Medicaid': 4376.4,
      'Mental Health and Addictions': 358.2,
      'Family Resources': 155.7,
      'Aging Services': 61.8,
      'Disability and Rehabilitative Services': 55.7,
      'Department of Child Services': 952.2,
      'Public Health': 189.8,
      'Other Health and Human Services': 108.3,
      'State Student Assistance': 400.5,
      'Other Higher Education': 1788.4,
      'Education Administration': 172.4,
      'Tuition Support': 9082.5,
      'Other Local Schools': 314.8,
      'Teacher Retirement': 1066.3,
      'Other Education': 17.4,
      'Distributions': 50.5
    },
    {
      year: 2026,
      'General Government': 997.6,
      'Corrections': 1058.7,
      'Other Public Safety': 419.0,
      'Conservation and Environment': 114.2,
      'Economic Development': 183.2,
      'Transportation': 45.0,
      'FSSA Administration': 19.1,
      'Medicaid': 5028.3,
      'Mental Health and Addictions': 350.0,
      'Family Resources': 151.8,
      'Aging Services': 56.7,
      'Disability and Rehabilitative Services': 55.3,
      'Department of Child Services': 1127.2,
      'Public Health': 140.8,
      'Other Health and Human Services': 107.8,
      'State Student Assistance': 409.0,
      'Other Higher Education': 1777.1,
      'Education Administration': 121.1,
      'Tuition Support': 9423.7,
      'Other Local Schools': 212.3,
      'Teacher Retirement': 1066.3,
      'Other Education': 10.5,
      'Distributions': 50.5
    },
    {
      year: 2027,
      'General Government': 976.6,
      'Corrections': 1054.7,
      'Other Public Safety': 413.2,
      'Conservation and Environment': 114.2,
      'Economic Development': 183.2,
      'Transportation': 45.0,
      'FSSA Administration': 19.1,
      'Medicaid': 5367.6,
      'Mental Health and Addictions': 350.0,
      'Family Resources': 151.8,
      'Aging Services': 56.7,
      'Disability and Rehabilitative Services': 55.3,
      'Department of Child Services': 1127.2,
      'Public Health': 140.8,
      'Other Health and Human Services': 107.8,
      'State Student Assistance': 409.0,
      'Other Higher Education': 1769.7,
      'Education Administration': 121.1,
      'Tuition Support': 9614.6,
      'Other Local Schools': 212.3,
      'Teacher Retirement': 1066.3,
      'Other Education': 10.5,
      'Distributions': 50.5
    }
  ];

const lineItemDescriptions = {
    // Administration & Development
    'General Government': {
        description: 'Core state operations and administrative functions',
        examples: 'Governor\'s office, Legislature, Courts, Elections, Administrative services, State buildings'
    },
    'Conservation and Environment': {
        description: 'Natural resource management and environmental protection programs',
        examples: 'State parks, Environmental regulations, Conservation programs, Water quality monitoring, Fish & wildlife'
    },
    'Economic Development': {
        description: 'Programs to promote business growth and workforce development',
        examples: 'Job training, Business incentives, Tourism promotion, Community development grants, Workforce programs'
    },
    'Transportation': {
        description: 'Transportation planning and administrative operations',
        examples: 'DMV operations, Transportation planning, Traffic studies, Public transit administration'
    },
    'Distributions': {
        description: 'Shared revenues and support for local governments',
        examples: 'Local government aid, Revenue sharing, Gaming distributions, Special district funding'
    },

    // Public Safety
    'Corrections': {
        description: 'Prison system operations and rehabilitation programs',
        examples: 'State prisons, Parole system, Rehabilitation programs, Prison education, Staff training'
    },
    'Other Public Safety': {
        description: 'Law enforcement and emergency management services',
        examples: 'State Police, Emergency Management, Homeland Security, Fire Marshal, Criminal investigations'
    },

    // Education
    'Tuition Support': {
        description: 'State funding for K-12 public education',
        examples: 'Per-pupil funding, Special education support, Complexity grants, Full-day kindergarten'
    },
    'Other Higher Education': {
        description: 'Support for state colleges and universities',
        examples: 'University operations, Research funding, Campus improvements, Technology initiatives'
    },
    'Teacher Retirement': {
        description: 'Pension and retirement benefits for educators',
        examples: 'Teacher pensions, Retirement fund contributions, Healthcare benefits, Administrative costs'
    },
    'State Student Assistance': {
        description: 'Financial aid programs for higher education',
        examples: '21st Century Scholars, Frank O\'Bannon Grants, Adult Student Aid, Merit-based scholarships'
    },
    'Education Administration': {
        description: 'Oversight and management of education programs',
        examples: 'Department of Education operations, Assessment programs, Data systems, Program evaluation'
    },
    'Other Local Schools': {
        description: 'Additional support for K-12 education programs',
        examples: 'Career education, STEM initiatives, School safety grants, Technology programs'
    },
    'Other Education': {
        description: 'Miscellaneous education support programs',
        examples: 'Library services, Educational television, Vocational programs, Professional development'
    },

    // Health & Human Services
    'Medicaid': {
        description: 'Healthcare coverage for eligible low-income residents',
        examples: 'Medical services, Prescription drugs, Long-term care, Disability services, Children\'s health'
    },
    'Mental Health and Addictions': {
        description: 'Behavioral health and substance abuse services',
        examples: 'State hospitals, Addiction treatment, Crisis services, Prevention programs, Community mental health'
    },
    'Family Resources': {
        description: 'Support services for families and children',
        examples: 'TANF benefits, Food assistance, Child care support, Employment services'
    },
    'Aging Services': {
        description: 'Programs supporting elderly residents',
        examples: 'Senior services, Home care, Meals programs, Adult protective services, Community centers'
    },
    'Disability and Rehabilitative Services': {
        description: 'Support for individuals with disabilities',
        examples: 'Disability benefits, Vocational rehabilitation, Independent living services, Support programs'
    },
    'Department of Child Services': {
        description: 'Child welfare and protection programs',
        examples: 'Foster care, Adoption services, Child protection, Family preservation, Case management'
    },
    'Public Health': {
        description: 'Population health and disease prevention programs',
        examples: 'Immunizations, Health screening, Disease control, Health education, Emergency preparedness'
    },
    'Other Health and Human Services': {
        description: 'Additional health and social service programs',
        examples: 'Veterans services, Community health centers, Special population programs, Health research'
    },
    'FSSA Administration': {
        description: 'Management of Family and Social Services programs',
        examples: 'Program oversight, Eligibility systems, Quality control, Policy development, Staff training'
    }
};

const inflationFactors = {
  2016: 1.000,  
  2017: 1.025,  
  2018: 1.0462,  
  2019: 1.0625, 
  2020: 1.0889,  
  2021: 1.1041,  
  2022: 1.1867,  
  2023: 1.2628, 
  2024: 1.3018,  
  2025: 1.3409,  
  2026: 1.37,
  2027: 1.4  
};


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

const getCategoryColor = (item) => {
  const categoryColors = {
    'Education': {
      'Tuition Support': '#2563eb',         // Bright blue
      'Other Higher Education': '#9333ea',   // Purple
      'Teacher Retirement': '#0891b2',       // Cyan
      'State Student Assistance': '#4f46e5', // Indigo
      'Education Administration': '#1d4ed8',  // Darker blue
      'Other Local Schools': '#7c3aed',      // Violet
      'Other Education': '#3b82f6'           // Light blue
    },
    'Health & Human Services': {
      'Medicaid': '#16a34a',                // Green
      'Mental Health and Addictions': '#059669', // Emerald
      'Family Resources': '#15803d',         // Dark green
      'Aging Services': '#22c55e',          // Lime green
      'Disability and Rehabilitative Services': '#10b981', // Teal
      'Department of Child Services': '#047857', // Dark teal
      'Public Health': '#4ade80',           // Light green
      'Other Health and Human Services': '#84cc16', // Yellow-green
      'FSSA Administration': '#65a30d'       // Olive
    },
    'Public Safety': {
      'Corrections': '#eab308',             // Yellow
      'Other Public Safety': '#facc15'       // Bright yellow
    },
    'Administration & Development': {
      'General Government': '#dc2626',      // Red
      'Economic Development': '#ef4444',    // Bright red
      'Transportation': '#f97316',          // Orange
      'Conservation and Environment': '#ea580c', // Dark orange
      'Distributions': '#b91c1c'            // Dark red
    }
  };

  // Find the category and return the specific color
  for (const [category, items] of Object.entries(categoryColors)) {
    if (item in items) {
      return items[item];
    }
  }
  
  return '#666666'; // Default color for uncategorized items
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