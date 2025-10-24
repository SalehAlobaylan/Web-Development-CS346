import { api } from './api.js';
import { transactions } from './transactions.js';


let loans = [];

document.addEventListener('DOMContentLoaded', function() {
    api.requireAuth(); 

});

const signout = document.getElementById('signout');
if (signout) {
    signout.addEventListener('click', function(event) {
        event.preventDefault();
        api.logout();
    });
}

const sortElements = document.querySelectorAll('[data-sort]');
sortElements.forEach(element => {
    element.addEventListener('click', sortLoans);
});

function presentError(error) {
    if (error.message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'An error occurred. Please try again later.'
        });
    }
}

// Helper function to determine the color based on the loan status
function getStatusColor(status) {
    const statusColors = {
        'ACTIVE': '#FFD700',      // Gold
        'SETTLED': '#32CD32',     // LimeGreen
        'PENDING': '#FF8C00',     // DarkOrange
        'OVERDUE': '#FF4500',     // OrangeRed
        'CANCELED': '#A9A9A9'     // DarkGray
    };
    return statusColors[status] || '#A9A9A9'; // Default to DarkGray if status is unknown
}

function openLoanTransactionModal(loanCardHTML, _id) {
    const cardElement = loanCardHTML.querySelector(`#card-${_id}`);
    const dropdownContent = loanCardHTML.querySelector(`#dropdownContent-${_id}`);

    if (!cardElement) return;

    cardElement.addEventListener('click', () => {
        if (dropdownContent.classList.contains('open')) {
            dropdownContent.classList.remove('open');
        } else {
            dropdownContent.classList.add('open');
            getAllLoanTransactions(_id);
        }
    });
}

function transactionsEventListener(loanCardHTML, _id, userId) {
    const addButton = loanCardHTML.querySelector(`#addButton-${_id}`);
    openLoanTransactionModal(loanCardHTML, _id);

    addButton.addEventListener('click', (event) => {
        event.stopPropagation();

        // Load the modal HTML and add form submission logic
        fetch('add-transaction-modal.html')
            .then(response => response.text())
            .then(html => {
                document.getElementById('modal-container').innerHTML = html;
                const transactionModal = new bootstrap.Modal(document.getElementById('addTransactionModal'));
                transactionModal.show();

                // Add event listener for the transaction form submission
                const transactionForm = document.getElementById('transaction-form');
                transactionForm.addEventListener('submit', function (e) {
                    e.preventDefault();

                    const transactionData = {
                        type: document.getElementById('transactionType').value,
                        amount: document.getElementById('transactionAmount').value,
                        date: document.getElementById('transactionDate').value,
                        notes: document.getElementById('transactionNotes').value,
                    };

                    // validate amount and date not empy
                    if (!transactionData.amount || !transactionData.date) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Amount and Date are required'
                        });
                        return;
                    }

                    // Submit transaction based on userId and loanId
                    transactions.createTransaction(userId, _id, transactionData.type, transactionData.amount, transactionData.date, transactionData.notes)
                        .then((data) => {
                            if (!data) return;
                            transactionModal.hide();  // Close the modal after successful submission
                            getAllLoanTransactions(_id)
                            updateLoan(_id);
                        })
                        .catch((error) => {
                            presentError(error);
                        });
                });
            })
            .catch(err => {presentError(err)});
    });
}
async function updateLoan(loanId) {
    try {
        const userId = api.getUserId();
        const response = await api.get(`/user/${userId}/loans/${loanId}`);
        const updatedLoan = response.data;

        const loanCardContainer = document.getElementById(`card-${loanId}`);
        
        if (loanCardContainer) {
            // Update the status badge
            const statusBadge = document.getElementById(`status-badge-${loanId}`);
            const statusColor = getStatusColor(updatedLoan.status);
            statusBadge.innerText = updatedLoan.status;
            statusBadge.style.backgroundColor = statusColor;

            // Update the progress bar
            const progressBar = document.getElementById(`progress-bar-${loanId}`);
            const progressPercentage = ((updatedLoan.totalPaid / updatedLoan.totalAmount) * 100).toFixed(1);
            progressBar.style.width = `${progressPercentage}%`;

            // Update the paid amount
            const paidAmount = document.getElementById(`paid-amount-${loanId}`);
            paidAmount.innerText = `${updatedLoan.totalPaid} SAR`;

            // Update the total amount
            const totalAmount = document.getElementById(`total-amount-${loanId}`);
            totalAmount.innerText = `${updatedLoan.totalAmount} SAR`;
        } else {
            // If the loan card doesn't exist, add it to the loan list
            const loanList = document.getElementById('loan-list');
            const loanCardHTML = renderLoanCard(updatedLoan, userId, loans.length - 1);
            loanList.insertAdjacentElement('afterbegin', loanCardHTML);
        }

    } catch (error) {
        presentError(error);
    }
}


async function getAllLoanTransactions(loanId) {
    toggleLoading(`transaction-list-${loanId}`); // Show loading indicator
    const userId = api.getUserId();
    const transactionList = document.getElementById(`transactionList-${loanId}`);
    const loanTransactions = await transactions.getAllTransactions(userId, loanId);

    if (loanTransactions.length === 0) {
        transactionList.innerHTML = '<p class="text-center" style="color: var(--text-secondary-color); margin: 50px 0px;">No transactions found</p>';
        toggleLoading(`transaction-list-${loanId}`); // Hide loading indicator
        return;
    }

    // sort transaction by closest date
    loanTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    transactionList.innerHTML = await loanTransactions.map(transaction => {
        const { _id, type, amount, date, notes } = transaction;
        const formattedDate = new Date(date).toLocaleDateString('en-GB');
        
        // Select appropriate icon based on transaction type
        const icon = type === 'INCREASE' 
            ? '<i class="bi bi-cash-coin" style="color: var(--lender-border);"></i>' // Loan increment icon
            : '<i class="bi bi-cash-stack" style="color: var(--borrower-border);"></i>'; // Loan repayment icon
    
        // Select appropriate type label (translated)
        const typeLabel = type === 'INCREASE' ? 'Additional Funds' : 'Repayment';
    
        // Display notes better
        const notesHTML = notes 
            ? `<div class="transaction-notes">${notes}</div>` 
            : '';
    
        // Determine the amount styling and label based on transaction type
        const amountDisplay = type === 'INCREASE' 
            ? `<div class="transaction-amount positive" style="white-space: nowrap; color: green;">${amount} SAR</div>` 
            : `<div class="transaction-amount negative" style="white-space: nowrap; color: red;">${amount} SAR</div>`;
    
        return `
            <div id="${_id}" class="transaction my-3">
                <!-- Transaction Row Layout -->
                <div class="d-flex flex-column align-items-center justify-content-between">
                    <!-- Icon and Transaction Details (Type and Date) -->
                    <div class="d-flex justify-content-between align-items-center">
                        <!-- Icon -->
                        <div class="me-3" style="font-size: 24px;">
                            ${icon}
                        </div>
                        <!-- Type and Date -->
                        <div class="d-flex flex-column">
                            <span class="transaction-type"><strong>${typeLabel}</strong></span>
                            <!-- Notes -->
                            ${notesHTML}
                            <span class="transaction-date" style="color: var(--text-secondary-color); font-size: 0.9rem;">${formattedDate}</span>
                        </div>
                    </div>
                </div>
                <!-- Amount (Right-Aligned) -->
                <div class="d-flex justify-content-center">
                ${amountDisplay}
                    <!-- Delete Button with Trash Icon -->
                    <button class="btn-delete-transaction" data-transaction-id="${_id}" style="border: none; background: transparent;">
                        <i class="bi bi-trash" style="color: red; font-size: 24px;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    const deleteButtons = transactionList.querySelectorAll('.btn-delete-transaction');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async function(event) {
            event.stopPropagation();  // Prevent triggering the parent click event
            const transactionId = button.getAttribute('data-transaction-id');
            if (await transactions.deleteTransaction(userId, loanId, transactionId)){
                updateLoan(loanId);
                document.getElementById(transactionId).remove();
            }
        });
    });
    toggleLoading(`transaction-list-${loanId}`); // Show loading indicator
}

// Helper function to render a loan card
function renderLoanCard(loan, userId, index = 0) {
    const { _id, title, ownerId, ownerName, partyId, partyName, role, status, totalPaid, totalAmount, date } = loan;

    const otherPartyName = (userId === ownerId) ? partyName : ownerName;
    const userRole = (userId === partyId) ? role : (role === 'BORROWER' ? 'LENDER' : 'BORROWER');
    const formattedDate = new Date(date).toLocaleDateString('en-GB');
    const progressPercentage = ((totalPaid / totalAmount) * 100).toFixed(1);

    const statusColor = getStatusColor(status);
    const triangleImage = userRole === 'BORROWER' ? './resources/triangle-fill.svg' : './resources/triangle-fill-green.svg';
    const triangleDgree = userRole === 'BORROWER' ? 'rotate(180deg)' : 'rotate(0deg)';
    const cardClass = (status === 'PENDING' || status === 'REJECTED') ? 'card-disabled' : (userRole === 'BORROWER' ? 'card-borrower' : 'card-lender');
    const progressBarColor = userRole === 'BORROWER' ? 'progress-bar-borrower' : 'progress-bar-lender';

    const animationDelay = `${index * 0.1}s`;

    // Generate loan card HTML
    
    const loanCardHTML = document.createElement('div');
    loanCardHTML.innerHTML = `
    <div class="card-wrapper my-2 fade-in slide-in" style="animation-delay: ${animationDelay};" id="card-${_id}">
        <div class="left-border-indicator ${cardClass}-indicator"></div>
        <div class="card">
            <div class="card-body ${cardClass}">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h5 class="card-title" style="color: var(--text-color);">${title}</h5>
                        <p class="card-subtitle" style="color: var(--text-color);">${otherPartyName}</p>
                    </div>
                    <div>
                        <img style="transform: ${triangleDgree}; padding-left: 5px;" src=${triangleImage} alt="Dropdown Arrow">
                        <span class="badge rounded-pill" id="status-badge-${_id}" style="background-color: ${statusColor} !important;">${status}</span>
                    </div>
                </div>
                <div class="progress my-2">
                    <div id="progress-bar-${_id}" class="${progressBarColor}" style="width: ${progressPercentage}%;"></div>
                </div>
                <div class="d-flex justify-content-between">
                    <span id="paid-amount-${_id}" style="color: var(--text-color);">${totalPaid} SAR</span>
                    <span id="total-amount-${_id}" style="color: var(--text-color);">${totalAmount} SAR</span>
                </div>
                <p style="color: var(--text-secondary-color);">Initiated ${formattedDate}</p>

                <!-- Dropdown Modal for Transaction History -->
                <div class="dropdown-modal-content" id="dropdownContent-${_id}">
                    <div class="dropdown-modal-header d-flex justify-content-between align-items-center">
                        <span class="dropdown-modal-title" style="color: var(--text-color);">Transactions history</span>
                        <button class="dropdown-modal-icon-button" id="addButton-${_id}" style="background: none; border: none; color: var(--text-color);">
                            <i class="bi bi-plus-circle" style="font-size: 20px;"></i>
                        </button>
                    </div>
                    <div id="loading-indicator-transaction-list-${_id}" class="loading-spinner" style="display: none;">Loading...</div>
                    <div id="transactionList-${_id}">
                        <!-- Transactions will be inserted here dynamically by JavaScript -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;


    // Add event listener to the entire card
    if (status !== 'PENDING' && status !== 'REJECTED') {
        transactionsEventListener(loanCardHTML, _id, userId); 
}



    return loanCardHTML;
}


function loadNotifications(loan) {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) {
        console.error('Notification list element not found');
        return;
    }

    const isBorrower = loan.role === 'BORROWER';
    const actionVerb = isBorrower ? 'lending' : 'borrowing';
    const icon = isBorrower ? '💰' : '🤝';
    const typeClass = isBorrower ? 'lender' : 'borrower';
    const badgeClass = isBorrower ? 'lender-badge' : 'borrower-badge';

    const notificationCard = document.createElement('div');
    notificationCard.classList.add('notification-card');

    notificationCard.innerHTML = `
        <div class="notification-header">
            <div class="notification-icon ${typeClass}">
                ${icon}
            </div>
            <div class="notification-content">
                <span class="notification-badge ${badgeClass}">${loan.role}</span>
                <div class="notification-title">New Loan Request</div>
            </div>
        </div>
        <p class="notification-message">
            <strong>${loan.ownerName}</strong> has created a loan with you, ${actionVerb} you <strong>${loan.totalAmount} SAR</strong>. 
            This loan is awaiting your approval.
        </p>
        <div class="notification-amount">
            💵 ${loan.totalAmount} SAR
        </div>
        <div class="notification-actions">
            <button class="notification-btn notification-btn-accept">
                ✓ Accept
            </button>
            <button class="notification-btn notification-btn-reject">
                ✗ Reject
            </button>
        </div>
    `;

    const acceptButton = notificationCard.querySelector('.notification-btn-accept');
    const rejectButton = notificationCard.querySelector('.notification-btn-reject');

    acceptButton.addEventListener('click', () => handleLoanAction(loan._id, 'ACTIVE', notificationCard, loan));
    rejectButton.addEventListener('click', () => handleLoanAction(loan._id, 'REJECTED', notificationCard));

    notificationList.appendChild(notificationCard);
}


async function handleLoanAction(loanId, status, notificationCard, loan = null) {
    try {
        const userId = api.getUserId(); 

        const response = await api.patch(`/user/${userId}/loans/${loanId}`, { status })

        if (response.status === 204) {
            Swal.fire({
                icon: 'success',
                title: `Loan ${status.toLowerCase()}ed successfully`
            })

            notificationCard.remove();
            const notificationList = document.getElementById('notification-list');
            if (notificationList.children.length === 0) {
                if (notificationList) {
                    notificationList.innerHTML = '<div class="no-notifications"><i class="bi bi-bell-slash"></i><p>No new notifications</p></div>';
                }
            }
            if (status === 'ACTIVE') {
                loan.status = 'ACTIVE';
                const loanCardHTML = renderLoanCard(loan, userId);
                const loanList = document.getElementById('loan-list');
                loanList.insertAdjacentElement('afterbegin', loanCardHTML);
            } else if (status === 'REJECTED') {
                window.location.reload();
            }
        }
    } catch (error) {
        presentError(error);
    }
}

function presentShowHiddenLoans() {
    if (loans.some(loan => loan.isHidden)) {
        const createButton = document.getElementById('modal-container');
        
        // Inject raw HTML
        createButton.insertAdjacentHTML('beforeend', `
            <button id="toggle-hidden-loans" class="btn" style="color: var(--text-secondary-color); width: 100%; margin: 20px 0px;">Show hidden loans</button>
            <div id="hidden-loans-list" class="card-container" style="display: none;"></div>
        `);
        
        // Add click event listener to the button
        document.getElementById('toggle-hidden-loans').addEventListener('click', toggleHiddenLoans);
    }
}

function toggleHiddenLoans() {
    const hiddenLoanList = document.getElementById('hidden-loans-list');
    const toggleButton = document.getElementById('toggle-hidden-loans');
    const userId = api.getUserId();
    
    if (hiddenLoanList.style.display === 'none') {
        hiddenLoanList.innerHTML = loans
            .filter(loan => loan.isHidden)
            .map((loan, index) => renderLoanCard(loan, userId, index).innerHTML)
            .join(''); // Generate loan cards and inject them
        hiddenLoanList.style.display = 'block';
        toggleButton.innerHTML = 'Hide hidden loans';
    } else {
        hiddenLoanList.style.display = 'none';
        toggleButton.innerHTML = 'Show hidden loans';
    }
}

function toggleLoading(forSpinnerId){
    // toggling for all elements that has the loading spinner class
    const loadingIndicator = document.getElementById(`loading-indicator-${forSpinnerId}`);

    if (!loadingIndicator) return;

    if (loadingIndicator.style.display === 'block') {
        loadingIndicator.style.display = 'none';
    } else {
        loadingIndicator.style.display = 'block';
    }

    // hide id="modal-container" when loading
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer && forSpinnerId == 'loan-list') { 
        modalContainer.style.display = modalContainer.style.display === 'none' ? 'block' : 'none';
    }
}

async function getAllLoans() {
    const loanList = document.getElementById('loan-list'); // Declared here

    try {
        // Show the loading indicator and clear the existing loan list
        toggleLoading("loan-list");
        toggleLoading("notifications-list");
        loanList.innerHTML = ''; 

        const userId = api.getUserId();  // Get current user's ID
        const response = await api.get(`/user/${userId}/loans`);
        loans = response.data;
        let hasNotifications = false; // Use let here, because it's reassigned later

        loanList.innerHTML = ''; // Clear existing loans again, though this is redundant after the earlier line

        loans.forEach((loan, index) => {
            const isOwner = userId === loan.ownerId;
            if(!loan.isHidden && loan.status !== 'REJECTED' && (isOwner || loan.status !== 'PENDING')) {
                const loanCardHTML = renderLoanCard(loan, userId, index);
                loanList.insertAdjacentElement('beforeend', loanCardHTML);
            }

            if (userId === loan.partyId && loan.status === "PENDING") {
                hasNotifications = true;
                loadNotifications(loan); // Load notifications for pending loans
            }
        });

        // Show message if no notifications are found
        if (!hasNotifications) {
            const notificationList = document.getElementById('notification-list');
            if (notificationList) {
                notificationList.innerHTML = '<div class="no-notifications"><i class="bi bi-bell-slash"></i><p>No new notifications</p></div>';
            }
        }

        if (loans.some(loan => loan.isHidden)) {
            presentShowHiddenLoans();
        }
    } catch (error) {
        presentError(error);
    } finally {
        // Hide the loading indicator after data is loaded
        toggleLoading("loan-list");
        toggleLoading("notifications-list");
    }
}



function sortLoans(e) {
    const userId = api.getUserId(); 
    const sortType = e.target.getAttribute('data-sort');
    let order = e.target.getAttribute('data-order') || 'asc';

    // we are not geting the loans in the loan list
    // let's print somethign that may help us identify the issue


    if (sortType == 'amount' || sortType == 'date') {
        order = order === 'asc' ? 'desc' : 'asc';
        e.target.setAttribute('data-order', order);
        const icon = e.target.querySelector('i');
        icon.className = order === 'asc' ? 'bi bi-arrow-up-circle me-2' : 'bi bi-arrow-down-circle me-2';;
    }

    switch (sortType) {
        case 'amount':
            loans.sort((a, b) => {
                return order === 'asc' ? a.totalAmount - b.totalAmount : b.totalAmount - a.totalAmount;
            })
            break;
        case 'date':
            loans.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return order === 'asc' ? dateA - dateB : dateB - dateA;
            })
            break;
        case 'status':
            const statusOrder = ['OVERDUE', 'ACTIVE', 'PENDING', 'SETTLED', 'REJECTED'];
            loans.sort((a, b) => {
                const statusA = statusOrder.indexOf(a.status);
                const statusB = statusOrder.indexOf(b.status);
                return order === 'asc' ? statusA - statusB : statusB - statusA;
            })
            break;
        default:
            break;
    }

    const loanList = document.getElementById('loan-list');
    loanList.innerHTML = ''; // Clear existing loans
    loans.forEach((loan, index) => {
        
        if (!loan.isHidden && loan.status !== 'REJECTED' && loan.status !== 'PENDING') {
        const loanCardHTML = renderLoanCard(loan, userId, index);
        loanList.insertAdjacentElement('beforeend', loanCardHTML);
        }
    });
}


function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// Call getAllLoans on page load
window.onload = getAllLoans;
