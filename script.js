// Format number with commas
function formatNumber(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Parse formatted number string back to number
function parseFormattedNumber(string) {
    if (typeof string !== 'string') return 0;
    return parseFloat(string.replace(/,/g, '')) || 0;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format percent
function formatPercent(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}

// Calculate mortgage payments
function calculateMortgagePayments(homePrice, downPayment, interestRate, loanTerm, propertyTaxRate, monthlyRent) {
    // Calculate loan amount
    const loanAmount = homePrice - downPayment;
    
    // Convert annual interest rate to monthly
    const monthlyRate = (interestRate / 100) / 12;
    
    // Calculate number of monthly payments
    const numPayments = loanTerm * 12;
    
    // Calculate monthly P&I payment
    let monthlyPayment;
    if (monthlyRate === 0) {
        monthlyPayment = loanAmount / numPayments;
    } else {
        monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    }
    
    // Calculate monthly property tax
    const annualPropertyTax = homePrice * (propertyTaxRate / 100);
    const monthlyPropertyTax = annualPropertyTax / 12;
    
    // Calculate amortization schedule
    let schedule = [];
    let remainingBalance = loanAmount;
    let totalInterest = 0;
    
    for (let month = 1; month <= numPayments; month++) {
        // Calculate interest for this month
        const interestPayment = remainingBalance * monthlyRate;
        
        // Calculate principal for this month
        const principalPayment = monthlyPayment - interestPayment;
        
        // Update running totals
        totalInterest += interestPayment;
        remainingBalance -= principalPayment;
        
        // Calculate cumulative interest rate
        const cumulativeRate = (totalInterest / loanAmount) * 100;
        
        // Calculate cumulative rent if provided
        const cumulativeRentPaid = monthlyRent ? monthlyRent * month : null;
        
        schedule.push({
            month: month,
            payment: monthlyPayment,
            principal: principalPayment,
            interest: interestPayment,
            remaining_balance: Math.max(0, remainingBalance),
            total_interest_paid: totalInterest,
            effective_rate: cumulativeRate,
            cumulative_rent: cumulativeRentPaid,
            property_tax: monthlyPropertyTax
        });
    }
    
    return {
        monthly_payment: monthlyPayment,
        monthly_property_tax: monthlyPropertyTax,
        total_monthly_payment: monthlyPayment + monthlyPropertyTax,
        total_interest: totalInterest,
        total_cost: loanAmount + totalInterest,
        annual_property_tax: annualPropertyTax,
        loan_amount: loanAmount,
        nominal_rate: interestRate,
        amortization_schedule: schedule
    };
}

// Initialize chart variables
let expenseChart = null;
let savingsChart = null;

// Function to create chart options
function createChartOptions(yAxisLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            title: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Month'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#fff'
                }
            },
            y: {
                title: {
                    display: true,
                    text: yAxisLabel
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#fff',
                    callback: function(value) {
                        return formatCurrency(value);
                    }
                }
            }
        }
    };
}

// Function to update charts
function updateCharts(data) {
    const months = data.map(item => item.month);
    const principalPaid = data.map(item => {
        const totalPrincipal = item.payment * item.month - item.total_interest_paid;
        return parseFloat(totalPrincipal.toFixed(2));
    });
    const totalInterest = data.map(item => parseFloat(item.total_interest_paid.toFixed(2)));
    const cumulativeRent = data.map(item => item.cumulative_rent !== null ? parseFloat(item.cumulative_rent.toFixed(2)) : null);
    
    // Calculate savings vs buying
    let cumulativeSavings = [];
    let totalAmountPaid = 0;
    data.forEach(month => {
        totalAmountPaid += month.payment + month.property_tax;
        const monthlyRentAmount = month.cumulative_rent !== null ? 
            (month.cumulative_rent / month.month) : null;
        if (monthlyRentAmount !== null) {
            const monthlySavings = (month.payment + month.property_tax) - monthlyRentAmount;
            cumulativeSavings.push(parseFloat(monthlySavings * month.month).toFixed(2));
        } else {
            cumulativeSavings.push(null);
        }
    });

    // Update Expense Chart
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    if (expenseChart) {
        expenseChart.destroy();
    }
    expenseChart = new Chart(expenseCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Total Interest (Cost of Borrowing)',
                    data: totalInterest,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        },
        options: createChartOptions('Money Spent ($)')
    });

    // Add rent dataset to expense chart if rent data exists
    if (cumulativeRent.some(value => value !== null)) {
        expenseChart.data.datasets.push({
            label: 'Total Rent Paid',
            data: cumulativeRent,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            borderWidth: 2,
            fill: true
        });
        expenseChart.update();
    }

    // Update Savings Chart
    const savingsCtx = document.getElementById('savingsChart').getContext('2d');
    if (savingsChart) {
        savingsChart.destroy();
    }
    savingsChart = new Chart(savingsCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Principal Paid (Home Equity)',
                    data: principalPaid,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        },
        options: createChartOptions('Money Saved ($)')
    });

    // Add savings vs buying dataset if rent data exists
    if (cumulativeRent.some(value => value !== null)) {
        savingsChart.data.datasets.push({
            label: 'Extra Savings if Renting',
            data: cumulativeSavings,
            borderColor: '#ffc107',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: true
        });
        savingsChart.update();
    }
}

// Highlight active section in navigation
function highlightActiveSection() {
    const sections = document.querySelectorAll('.card[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentSection = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop - 100) {
            currentSection = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === currentSection) {
            link.classList.add('active');
        }
    });
}

// Add scroll event listener
window.addEventListener('scroll', highlightActiveSection);

// Initialize number formatting when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Format initial values
    const homePrice = document.getElementById('homePrice');
    const downPayment = document.getElementById('downPayment');
    
    if (homePrice.value) {
        homePrice.value = formatNumber(parseInt(homePrice.value));
    }
    if (downPayment.value) {
        downPayment.value = formatNumber(parseInt(downPayment.value));
    }
});

// Format number inputs
const homePriceInput = document.getElementById('homePrice');
const downPaymentInput = document.getElementById('downPayment');

homePriceInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value) {
        const number = parseInt(value);
        if (!isNaN(number)) {
            e.target.value = formatNumber(number);
        }
    }
});

downPaymentInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value) {
        const number = parseInt(value);
        if (!isNaN(number)) {
            e.target.value = formatNumber(number);
        }
    }
});

// Handle form submission
document.getElementById('mortgageForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const result = calculateMortgagePayments(
        parseFormattedNumber(homePriceInput.value),
        parseFormattedNumber(downPaymentInput.value),
        parseFloat(document.getElementById('interestRate').value),
        parseInt(document.getElementById('loanTerm').value),
        parseFloat(document.getElementById('propertyTax').value),
        parseFormattedNumber(document.getElementById('monthlyRent').value) || null
    );

    // Update amortization table
    const tableBody = document.querySelector('.table tbody');
    tableBody.innerHTML = '';

    // Update Payment Summary section
    document.getElementById('monthlyPayment').textContent = formatCurrency(result.monthly_payment);
    document.getElementById('principalAndInterest').textContent = formatCurrency(result.monthly_payment);
    document.getElementById('propertyTaxPayment').textContent = formatCurrency(result.monthly_property_tax);
    document.getElementById('totalMonthlyPayment').textContent = formatCurrency(result.total_monthly_payment);
    
    document.getElementById('loanAmount').textContent = formatCurrency(result.loan_amount);
    document.getElementById('downPaymentAmount').textContent = formatCurrency(parseFormattedNumber(downPaymentInput.value));
    document.getElementById('interestRateDisplay').textContent = formatPercent(parseFloat(document.getElementById('interestRate').value));
    document.getElementById('loanTermDisplay').textContent = document.getElementById('loanTerm').value + ' years';
    document.getElementById('totalInterestPaid').textContent = formatCurrency(result.total_interest);
    document.getElementById('totalCost').textContent = formatCurrency(result.total_cost);
    
    let totalPrincipalPaid = 0;
    let totalAmountPaid = 0;
    let cumulativeSavings = 0;
    
    result.amortization_schedule.forEach(month => {
        totalPrincipalPaid += month.principal;
        totalAmountPaid += month.payment + month.property_tax;
        
        // Calculate savings (mortgage payment - rent) to show how much more money you'd have if renting
        const monthlyRentAmount = month.cumulative_rent !== null ? 
            (month.cumulative_rent / month.month) : 0;  // Get monthly rent from cumulative
        const monthlySavings = (month.payment + month.property_tax) - monthlyRentAmount;
        cumulativeSavings += monthlySavings;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month.month}</td>
            <td class="text-primary fw-bold">${formatCurrency(totalAmountPaid)}</td>
            <td>${formatCurrency(month.payment)}</td>
            <td class="text-success">${formatCurrency(month.principal)}</td>
            <td class="text-danger">${formatCurrency(month.interest)}</td>
            <td class="text-danger">${formatCurrency(month.total_interest_paid)}</td>
            <td class="text-success">${formatCurrency(totalPrincipalPaid)}</td>
            <td>${formatCurrency(month.remaining_balance)}</td>
            <td>${formatPercent(month.effective_rate)}</td>
            <td class="text-primary">${month.cumulative_rent !== null ? formatCurrency(month.cumulative_rent) : '-'}</td>
            <td class="${cumulativeSavings > 0 ? 'text-success' : 'text-danger'} fw-bold">
                ${month.cumulative_rent !== null ? formatCurrency(cumulativeSavings) : '-'}
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update charts
    updateCharts(result.amortization_schedule);

    // Show results with animation
    const resultsSection = document.getElementById('results');
    resultsSection.style.display = 'block';
    // Force a reflow to ensure the animation triggers
    void resultsSection.offsetWidth;
    resultsSection.classList.add('show');
});
