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
            cumulative_rent: cumulativeRentPaid
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

// Initialize chart variable
let paymentChart = null;

// Function to update or create chart
function updateChart(data) {
    const ctx = document.getElementById('paymentChart').getContext('2d');
    
    // Prepare data
    const months = data.map(item => item.month);
    const principalPaid = data.map(item => {
        const totalPrincipal = item.payment * item.month - item.total_interest_paid;
        return parseFloat(totalPrincipal.toFixed(2));
    });
    const totalInterest = data.map(item => parseFloat(item.total_interest_paid.toFixed(2)));
    const cumulativeRent = data.map(item => item.cumulative_rent !== null ? parseFloat(item.cumulative_rent.toFixed(2)) : null);

    // Destroy existing chart if it exists
    if (paymentChart) {
        paymentChart.destroy();
    }

    // Create new chart
    paymentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Principal Paid',
                    data: principalPaid,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderWidth: 2,
                    fill: true
                },
                {
                    label: 'Total Interest',
                    data: totalInterest,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true
                }
            ]
        },
        options: {
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
                        text: 'Amount ($)'
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
        }
    });

    // Add rent dataset if rent data exists
    if (cumulativeRent.some(value => value !== null)) {
        paymentChart.data.datasets.push({
            label: 'Cumulative Rent',
            data: cumulativeRent,
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            borderWidth: 2,
            fill: true
        });
        paymentChart.update();
    }
}

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
    
    // Update results
    document.getElementById('monthlyPayment').textContent = formatCurrency(result.total_monthly_payment);
    document.getElementById('principalInterest').textContent = formatCurrency(result.monthly_payment);
    document.getElementById('propertyTaxAmount').textContent = formatCurrency(result.monthly_property_tax);
    document.getElementById('loanAmount').textContent = formatCurrency(result.loan_amount);
    document.getElementById('totalInterest').textContent = formatCurrency(result.total_interest);
    document.getElementById('totalCost').textContent = formatCurrency(result.total_cost);
    document.getElementById('nominalRate').textContent = formatPercent(result.nominal_rate);

    // Update amortization table
    const tableBody = document.querySelector('#amortizationTable tbody');
    tableBody.innerHTML = '';

    result.amortization_schedule.forEach(month => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${month.month}</td>
            <td>${formatCurrency(month.payment)}</td>
            <td class="text-success">${formatCurrency(month.principal)}</td>
            <td class="text-danger">${formatCurrency(month.interest)}</td>
            <td class="text-danger">${formatCurrency(month.total_interest_paid)}</td>
            <td>${formatCurrency(month.remaining_balance)}</td>
            <td>${formatPercent(month.effective_rate)}</td>
            <td class="text-primary">${month.cumulative_rent !== null ? formatCurrency(month.cumulative_rent) : '-'}</td>
        `;
        tableBody.appendChild(row);
    });

    // Update chart
    updateChart(result.amortization_schedule);

    // Show results
    document.getElementById('results').style.display = 'block';
});
