// ========================================
// Invoice Payment Proposal Chat Agent
// ========================================

// State management
const state = {
    currentStep: 0,
    conversationPhase: 'initial', // initial, showing-exceptions, resolve-invoice, business-rule, processing
    isTyping: false,
    processedInvoices: 0,
    totalInvoices: 0
};

// Sample invoice data
const invoiceData = [
    { id: 'INV-2024-0847', supplier: 'AA Corp', amount: 78500, dueDate: '2026-04-08', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'critical', daysOverdue: 6 },
    { id: 'INV-2024-0852', supplier: 'AA Corp', amount: 45200, dueDate: '2026-04-09', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'critical', daysOverdue: 5 },
    { id: 'INV-2024-0861', supplier: 'AA Corp', amount: 32100, dueDate: '2026-04-10', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'high', daysOverdue: 4 },
    { id: 'INV-2024-0839', supplier: 'Beta Industries', amount: 23400, dueDate: '2026-04-07', terms: 'Net 45', exception: 'Price Variance', severity: 'high', daysOverdue: 7 },
    { id: 'INV-2024-0871', supplier: 'AA Corp', amount: 19800, dueDate: '2026-04-11', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'medium', daysOverdue: 3 },
    { id: 'INV-2024-0855', supplier: 'Gamma LLC', amount: 15600, dueDate: '2026-04-06', terms: 'Net 30', exception: 'Duplicate Entry', severity: 'medium', daysOverdue: 8 },
];

// Helper functions
function getTimeString() {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
}

function getSeverityClass(severity) {
    return { critical: 'severity-critical', high: 'severity-high', medium: 'severity-medium' }[severity] || 'severity-low';
}

function getSeverityIcon(severity) {
    return { critical: 'fa-circle-exclamation', high: 'fa-triangle-exclamation', medium: 'fa-circle-info' }[severity] || 'fa-circle';
}

// Disable previous action buttons
function disablePreviousButtons() {
    document.querySelectorAll('.action-btn:not([data-keep])').forEach(btn => { btn.disabled = true; btn.style.opacity = '0.5'; });
    document.querySelectorAll('.chip-action:not([data-keep])').forEach(chip => { chip.disabled = true; chip.style.opacity = '0.5'; });
}

// Typing indicator
function showTyping() {
    state.isTyping = true;
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar bot-avatar"><i class="fas fa-robot"></i></div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

function hideTyping() {
    state.isTyping = false;
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// Add user message
function addUserMessage(text) {
    disablePreviousButtons();
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message user-message';
    msgDiv.innerHTML = `
        <div class="message-avatar user-avatar">JD</div>
        <div class="message-content">
            <div class="message-bubble"><p>${text}</p></div>
            <span class="message-time">${getTimeString()}</span>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

// Add bot message
function addBotMessage(html, delay = 1500) {
    return new Promise(resolve => {
        showTyping();
        setTimeout(() => {
            hideTyping();
            const chatMessages = document.getElementById('chatMessages');
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message bot-message';
            msgDiv.innerHTML = `
                <div class="message-avatar bot-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <div class="message-bubble">${html}</div>
                    <span class="message-time">${getTimeString()}</span>
                </div>
            `;
            chatMessages.appendChild(msgDiv);
            scrollToBottom();
            resolve();
        }, delay);
    });
}

// Landing page functions
function focusInput() {
    document.getElementById('landingInput').focus();
}

function sendFromLanding() {
    const input = document.getElementById('landingInput');
    const text = input.value.trim();
    if (!text || state.isTyping) return;
    input.value = '';
    switchToChatView();
    sendUserMessage(text);
}

function startWithSuggestion(text) {
    switchToChatView();
    sendUserMessage(text);
}

function switchToChatView() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('chatView').style.display = 'flex';
    document.getElementById('chatInput').focus();
}

function sendSuggestion(text) {
    if (state.isTyping) return;
    document.getElementById('chatInput').value = '';
    sendUserMessage(text);
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || state.isTyping) return;
    input.value = '';
    sendUserMessage(text);
}

// Main message handler
function sendUserMessage(text) {
    addUserMessage(text);
    const lowerText = text.toLowerCase();

    if (state.conversationPhase === 'initial' && 
        (lowerText.includes('exception') || lowerText.includes('invoice') || lowerText.includes('payment'))) {
        handleExceptionQuery();
    } else if (state.conversationPhase === 'showing-exceptions') {
        if (lowerText.includes('yes') || lowerText.includes('sure') || lowerText.includes('resolve') || lowerText.includes('go ahead') || lowerText.includes('let\'s')) {
            handleResolveMostSevere();
        } else { handleGenericResponse(); }
    } else if (state.conversationPhase === 'resolve-invoice') {
        if (lowerText.includes('net 30') || lowerText.includes('confirm') || lowerText.includes('yes') || lowerText.includes('approve') || lowerText.includes('accept')) {
            handleConfirmPaymentTerm();
        } else if (lowerText.includes('net 45')) {
            handleSelectNet45();
        } else { handleGenericResponse(); }
    } else if (state.conversationPhase === 'business-rule') {
        if (lowerText.includes('yes') || lowerText.includes('confirm') || lowerText.includes('create') || lowerText.includes('define') || lowerText.includes('sure') || lowerText.includes('approve')) {
            handleConfirmBusinessRule();
        } else if (lowerText.includes('no') || lowerText.includes('skip') || lowerText.includes('don\'t')) {
            handleSkipBusinessRule();
        } else { handleGenericResponse(); }
    } else if (state.conversationPhase === 'manual-intervention') {
        if (lowerText.includes('reject') && (lowerText.includes('0839') || state.noDiscountStep === 0)) {
            handleRejectInvoice1();
        } else if (lowerText.includes('reject') && (lowerText.includes('0855') || state.noDiscountStep === 1)) {
            handleRejectInvoice2();
        } else if (lowerText.includes('approve') && state.noDiscountStep === 0) {
            handleApproveInvoice1();
        } else if (lowerText.includes('approve') && state.noDiscountStep === 1) {
            handleApproveInvoice2();
        } else { handleGenericResponse(); }
    } else {
        handleGenericResponse();
    }
}

// ========================================
// Phase 1: Show Payment Exceptions
// ========================================
async function handleExceptionQuery() {
    state.conversationPhase = 'showing-exceptions';

    const stepsHTML = `
        <p>🔍 Let me find invoices with payment exceptions for the past 10 days. Here's what I'm doing:</p>
        <div class="steps-container">
            <div class="step-item">
                <div class="step-number">1</div>
                <div class="step-content">
                    <strong>Filtering by Date Range</strong>
                    <span>Scanning invoices from Apr 4 – Apr 14, 2026</span>
                </div>
            </div>
            <div class="step-item">
                <div class="step-number">2</div>
                <div class="step-content">
                    <strong>Identifying Exceptions</strong>
                    <span>Checking payment terms mismatches, price variances, and duplicates</span>
                </div>
            </div>
            <div class="step-item">
                <div class="step-number">3</div>
                <div class="step-content">
                    <strong>Severity Assessment</strong>
                    <span>Ranking exceptions by financial impact and urgency</span>
                </div>
            </div>
            <div class="step-item">
                <div class="step-number">4</div>
                <div class="step-content">
                    <strong>Compiling Results</strong>
                    <span>Found <strong>6 invoices</strong> with payment exceptions</span>
                </div>
            </div>
        </div>
    `;
    await addBotMessage(stepsHTML, 1500);

    const tableHTML = `
        <div class="joule-list-card">
            <div class="list-card-header">
                <div class="list-card-title">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <div>
                        <h3>Payment Exceptions</h3>
                        <span class="list-card-subtitle">Invoices requiring attention</span>
                    </div>
                </div>
                <span class="list-card-count">${invoiceData.length} items</span>
            </div>
            <div class="list-card-body">
                ${invoiceData.map((inv, i) => `
                    <div class="list-card-item ${i === 0 ? 'highlight-item' : ''}">
                        <div class="item-icon ${getSeverityClass(inv.severity)}">
                            <i class="fas ${getSeverityIcon(inv.severity)}"></i>
                        </div>
                        <div class="item-content">
                            <div class="item-main">
                                <span class="item-id">${inv.id}</span>
                                <span class="item-separator">—</span>
                                <span class="item-supplier">${inv.supplier}</span>
                                <span class="item-amount">${formatCurrency(inv.amount)}</span>
                            </div>
                            <div class="item-details">
                                <span class="item-exception">${inv.exception}</span>
                                <span class="item-dot">·</span>
                                <span>Due ${new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                <span class="item-dot">·</span>
                                <span class="item-overdue">${inv.daysOverdue}d overdue</span>
                            </div>
                        </div>
                        <span class="severity-badge ${getSeverityClass(inv.severity)}">${inv.severity}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <p>⚠️ The most severe is <strong>${invoiceData[0].id}</strong> from <strong>${invoiceData[0].supplier}</strong> for <strong>${formatCurrency(invoiceData[0].amount)}</strong> — <strong>Terms Mismatch</strong>, ${invoiceData[0].daysOverdue} days overdue. Shall I resolve it?</p>
        <div class="action-buttons">
            <button class="action-btn primary" onclick="sendSuggestion('Yes, let\\'s resolve the most severe one')"><i class="fas fa-wrench"></i> Yes, resolve it</button>
            <button class="action-btn secondary" onclick="sendSuggestion('Show me more details')"><i class="fas fa-info-circle"></i> More details</button>
        </div>
    `;
    await addBotMessage(tableHTML, 2000);
}

// ========================================
// Phase 2: Resolve Invoice - Payment Terms
// ========================================
async function handleResolveMostSevere() {
    state.conversationPhase = 'resolve-invoice';

    const comparisonHTML = `
        <p>📊 Analyzing payment terms for <strong>INV-2024-0847</strong> from <strong>AA Corp</strong> (${formatCurrency(78500)}).</p>
        <p>I found a <strong>terms mismatch</strong> — submitted under <em>Net 45</em>, but the PO specifies <em>Net 30</em>.</p>
        <div class="joule-detail-cards">
            <div class="detail-card recommended">
                <div class="detail-card-header">
                    <div class="detail-card-title">
                        <span class="detail-card-name">Net 30</span>
                        <span class="recommended-badge"><i class="fas fa-star"></i> Recommended</span>
                    </div>
                </div>
                <div class="detail-card-body">
                    <div class="detail-section-title">Payment Details</div>
                    <div class="detail-row"><span class="detail-label">Payment Window</span><span class="detail-value">30 days</span></div>
                    <div class="detail-row"><span class="detail-label">Early Pay Discount</span><span class="detail-value highlight-green">2.0%</span></div>
                    <div class="detail-row"><span class="detail-label">Discount Window</span><span class="detail-value highlight-blue">10 days</span></div>
                    <div class="detail-row"><span class="detail-label">Potential Savings</span><span class="detail-value highlight-green">${formatCurrency(78500 * 0.02)}</span></div>
                    <div class="savings-callout"><i class="fas fa-piggy-bank"></i> Save ${formatCurrency(78500 * 0.02)} with early payment!</div>
                    <button class="action-btn primary full-width" onclick="sendSuggestion('Yes, confirm Net 30 with 2% discount')"><i class="fas fa-check"></i> Confirm Net 30</button>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-card-header">
                    <div class="detail-card-title">
                        <span class="detail-card-name">Net 45</span>
                        <span class="alternative-badge">Alternative</span>
                    </div>
                </div>
                <div class="detail-card-body">
                    <div class="detail-section-title">Payment Details</div>
                    <div class="detail-row"><span class="detail-label">Payment Window</span><span class="detail-value">45 days</span></div>
                    <div class="detail-row"><span class="detail-label">Early Pay Discount</span><span class="detail-value">1.0%</span></div>
                    <div class="detail-row"><span class="detail-label">Discount Window</span><span class="detail-value">20 days</span></div>
                    <div class="detail-row"><span class="detail-label">Potential Savings</span><span class="detail-value">${formatCurrency(78500 * 0.01)}</span></div>
                    <button class="action-btn secondary full-width" onclick="sendSuggestion('Apply Net 45 instead')">Use Net 45</button>
                </div>
            </div>
        </div>
        <p>💡 <strong>Recommendation:</strong> <strong>Net 30</strong> with 2% discount saves <strong>${formatCurrency(78500 * 0.02)}</strong> vs ${formatCurrency(78500 * 0.01)} with Net 45. The 10-day window fits the current processing timeline.</p>
    `;
    await addBotMessage(comparisonHTML, 2000);
}

async function handleSelectNet45() {
    state.conversationPhase = 'business-rule';
    await addBotMessage(`
        <div class="info-card">
            <i class="fas fa-info-circle"></i>
            <div>Applied <strong>Net 45</strong> terms with <strong>1% discount (20-day window)</strong> to invoice <strong>INV-2024-0847</strong>. Note: This saves ${formatCurrency(78500 * 0.01)} compared to ${formatCurrency(78500 * 0.02)} with Net 30.</div>
        </div>
    `, 1500);
    await showBusinessRulePrompt();
}

// ========================================
// Phase 3: Confirm Payment Term
// ========================================
async function handleConfirmPaymentTerm() {
    state.conversationPhase = 'business-rule';

    const confirmHTML = `
        <p>✅ <strong>Confirmed!</strong> Invoice <strong>INV-2024-0847</strong> has been updated:</p>
        <div class="joule-list-card compact">
            <div class="list-card-header">
                <div class="list-card-title">
                    <i class="fas fa-check-circle" style="color: var(--success)"></i>
                    <div><h3>Resolution Applied</h3><span class="list-card-subtitle">INV-2024-0847</span></div>
                </div>
                <span class="status-badge success">✓ Done</span>
            </div>
            <div class="list-card-body summary-body">
                <div class="detail-row"><span class="detail-label">Supplier</span><span class="detail-value">AA Corp</span></div>
                <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">${formatCurrency(78500)}</span></div>
                <div class="detail-row"><span class="detail-label">Payment Terms</span><span class="detail-value">Net 30</span></div>
                <div class="detail-row"><span class="detail-label">Discount Applied</span><span class="detail-value">2% (10-day window)</span></div>
                <div class="detail-row highlight-row"><span class="detail-label">Amount Saved</span><span class="detail-value highlight-green">${formatCurrency(78500 * 0.02)}</span></div>
            </div>
        </div>
    `;
    await addBotMessage(confirmHTML, 1500);
    await showBusinessRulePrompt();
}

// ========================================
// Phase 3b: Business Rule Suggestion
// ========================================
async function showBusinessRulePrompt() {
    const ruleHTML = `
        <p>🤖 I noticed that <strong>4 out of 6 exceptions</strong> are from <strong>AA Corp</strong> with the same "Terms Mismatch" pattern. Would you like me to create a <strong>business rule</strong> to automatically handle similar cases?</p>
        <div class="joule-list-card">
            <div class="list-card-header">
                <div class="list-card-title">
                    <i class="fas fa-cog"></i>
                    <div><h3>Proposed Business Rule</h3><span class="list-card-subtitle">Auto-resolve AA Corp terms mismatches</span></div>
                </div>
            </div>
            <div class="list-card-body">
                <div class="rule-item"><div class="rule-icon"><i class="fas fa-building"></i></div><div><strong>Supplier</strong><span>AA Corp (and subsidiaries)</span></div></div>
                <div class="rule-item"><div class="rule-icon"><i class="fas fa-tag"></i></div><div><strong>Exception Type</strong><span>Terms Mismatch (Net 30 vs Net 45)</span></div></div>
                <div class="rule-item"><div class="rule-icon"><i class="fas fa-gavel"></i></div><div><strong>Action</strong><span>Auto-select Net 30 with 2% early payment discount</span></div></div>
                <div class="rule-item"><div class="rule-icon"><i class="fas fa-clock"></i></div><div><strong>Discount Window</strong><span>10 days from invoice date</span></div></div>
                <div class="rule-item"><div class="rule-icon"><i class="fas fa-dollar-sign"></i></div><div><strong>Threshold</strong><span>Invoices up to $100,000</span></div></div>
                <div class="rule-item"><div class="rule-icon"><i class="fas fa-shield-alt"></i></div><div><strong>Approval</strong><span>Auto-apply (notify AP Manager)</span></div></div>
            </div>
        </div>
        <p>This rule would automatically resolve similar exceptions for AA Corp, saving time and maximizing discounts.</p>
        <div class="action-buttons">
            <button class="action-btn primary" onclick="sendSuggestion('Yes, create the business rule')"><i class="fas fa-plus"></i> Create Rule</button>
            <button class="action-btn secondary" onclick="sendSuggestion('No, skip the rule for now')"><i class="fas fa-forward"></i> Skip for now</button>
        </div>
    `;
    await addBotMessage(ruleHTML, 2000);
}

// ========================================
// Phase 4: Business Rule & Process
// ========================================
async function handleConfirmBusinessRule() {
    state.conversationPhase = 'processing';

    const ruleConfirmHTML = `
        <div class="success-card">
            <i class="fas fa-check-circle"></i>
            <div>Business rule <strong>BR-2026-0142</strong> created successfully and is now <strong>Active</strong>.</div>
        </div>
        <div class="joule-list-card compact">
            <div class="list-card-header">
                <div class="list-card-title">
                    <i class="fas fa-cog" style="color: var(--primary)"></i>
                    <div><h3>Rule: AA Corp Auto-Resolution</h3><span class="list-card-subtitle">BR-2026-0142</span></div>
                </div>
                <span class="status-badge success">Active</span>
            </div>
            <div class="list-card-body summary-body">
                <div class="detail-row"><span class="detail-label">Created</span><span class="detail-value">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
                <div class="detail-row"><span class="detail-label">Created By</span><span class="detail-value">Jane Doe (AP Manager)</span></div>
            </div>
        </div>
        <p>Now let me apply this rule to the remaining AA Corp invoices and process the other exceptions...</p>
    `;
    await addBotMessage(ruleConfirmHTML, 1500);
    await processRemainingInvoices();
}

async function handleSkipBusinessRule() {
    state.conversationPhase = 'processing';
    await addBotMessage(`<div class="info-card"><i class="fas fa-info-circle"></i><div>Skipping business rule. Processing remaining invoices manually...</div></div>`, 1000);
    await processRemainingInvoices();
}

async function processRemainingInvoices() {
    const remainingInvoices = [
        { id: 'INV-2024-0852', supplier: 'AA Corp', amount: 45200, savings: 45200 * 0.02 },
        { id: 'INV-2024-0861', supplier: 'AA Corp', amount: 32100, savings: 32100 * 0.02 },
        { id: 'INV-2024-0871', supplier: 'AA Corp', amount: 19800, savings: 19800 * 0.02 },
        { id: 'INV-2024-0839', supplier: 'Beta Industries', amount: 23400, savings: 0 },
        { id: 'INV-2024-0855', supplier: 'Gamma LLC', amount: 15600, savings: 0 },
    ];

    const progressHTML = `
        <p>⚙️ Processing remaining 5 invoices...</p>
        <div class="progress-container">
            <div class="progress-header-row">
                <span class="progress-label">Processing Invoices</span>
                <span class="progress-count" id="progressCount">0 / 5</span>
            </div>
            <div class="progress-bar-track"><div class="progress-bar-fill" id="progressBar" style="width:0%"></div></div>
            <div class="progress-items" id="progressItems">
                ${remainingInvoices.map((inv, i) => `
                    <div class="progress-item" id="progressItem${i}">
                        <i class="fas fa-circle progress-icon pending" id="progressIcon${i}"></i>
                        <span><strong>${inv.id}</strong> — ${inv.supplier} (${formatCurrency(inv.amount)})</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    await addBotMessage(progressHTML, 1500);

    for (let i = 0; i < remainingInvoices.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        const icon = document.getElementById(`progressIcon${i}`);
        icon.className = 'fas fa-spinner fa-spin progress-icon processing';
        await new Promise(resolve => setTimeout(resolve, 600));
        icon.className = 'fas fa-check-circle progress-icon done';
        const progress = Math.round(((i + 1) / remainingInvoices.length) * 100);
        document.getElementById('progressBar').style.width = progress + '%';
        document.getElementById('progressCount').textContent = `${i + 1} / 5`;
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    await showNoDiscountInvoices();
}

// ========================================
// Phase 5: No-Discount Invoices
// ========================================
async function showNoDiscountInvoices() {
    state.conversationPhase = 'manual-intervention';
    state.noDiscountStep = 0;

    const alertHTML = `
        <div class="warning-card">
            <i class="fas fa-exclamation-triangle"></i>
            <div><strong>Attention:</strong> 2 invoices do <strong>not offer any early payment discount</strong>. These require your manual intervention.</div>
        </div>
        <div class="joule-list-card alert-card">
            <div class="list-card-header">
                <div class="list-card-title">
                    <i class="fas fa-exclamation-circle" style="color: var(--danger)"></i>
                    <div><h3>No Discount Available</h3><span class="list-card-subtitle">Manual Review Required</span></div>
                </div>
                <span class="list-card-count">2 items</span>
            </div>
            <div class="list-card-body">
                <div class="list-card-item">
                    <div class="item-icon severity-high"><i class="fas fa-triangle-exclamation"></i></div>
                    <div class="item-content">
                        <div class="item-main"><span class="item-id">INV-2024-0839</span><span class="item-separator">—</span><span class="item-supplier">Beta Industries</span></div>
                        <div class="item-details"><span>${formatCurrency(23400)}</span><span class="item-dot">·</span><span>Net 45</span><span class="item-dot">·</span><span class="item-overdue">No discount</span><span class="item-dot">·</span><span>Price Variance</span></div>
                    </div>
                </div>
                <div class="list-card-item">
                    <div class="item-icon severity-medium"><i class="fas fa-circle-info"></i></div>
                    <div class="item-content">
                        <div class="item-main"><span class="item-id">INV-2024-0855</span><span class="item-separator">—</span><span class="item-supplier">Gamma LLC</span></div>
                        <div class="item-details"><span>${formatCurrency(15600)}</span><span class="item-dot">·</span><span>Net 30</span><span class="item-dot">·</span><span class="item-overdue">No discount</span><span class="item-dot">·</span><span>Duplicate Entry</span></div>
                    </div>
                </div>
            </div>
        </div>
        <p>Let's review them one at a time. Starting with the first one:</p>
    `;
    await addBotMessage(alertHTML, 1500);
    await showNoDiscountInvoice1();
}

async function showNoDiscountInvoice1() {
    const invoiceHTML = `
        <p>📄 <strong>Invoice 1 of 2: INV-2024-0839</strong></p>
        <div class="joule-list-card">
            <div class="list-card-header">
                <div class="list-card-title">
                    <i class="fas fa-file-invoice" style="color: var(--warning)"></i>
                    <div><h3>INV-2024-0839</h3><span class="list-card-subtitle">Beta Industries</span></div>
                </div>
                <span class="status-badge warning">No Discount</span>
            </div>
            <div class="list-card-body summary-body">
                <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">${formatCurrency(23400)}</span></div>
                <div class="detail-row"><span class="detail-label">Payment Terms</span><span class="detail-value">Net 45</span></div>
                <div class="detail-row"><span class="detail-label">Early Pay Discount</span><span class="detail-value" style="color: var(--danger); font-weight: 600;">None — 0%</span></div>
                <div class="detail-row"><span class="detail-label">Exception Type</span><span class="detail-value">Price Variance ($1,200 over PO)</span></div>
                <div class="detail-row"><span class="detail-label">Days Overdue</span><span class="detail-value">7 days</span></div>
            </div>
        </div>
        <div class="danger-card">
            <i class="fas fa-ban"></i>
            <div><strong>AI Recommendation: Reject</strong> — No discount offered, and the invoice shows a price variance of $1,200 above the PO amount. Recommend rejecting and requesting a corrected invoice.</div>
        </div>
        <div class="action-buttons">
            <button class="action-btn danger" onclick="sendSuggestion('Reject INV-2024-0839')"><i class="fas fa-times"></i> Reject</button>
            <button class="action-btn secondary" onclick="sendSuggestion('Approve INV-2024-0839 anyway')"><i class="fas fa-check"></i> Approve Anyway</button>
        </div>
    `;
    await addBotMessage(invoiceHTML, 2000);
}

async function showNoDiscountInvoice2() {
    const invoiceHTML = `
        <p>📄 <strong>Invoice 2 of 2: INV-2024-0855</strong></p>
        <div class="joule-list-card">
            <div class="list-card-header">
                <div class="list-card-title">
                    <i class="fas fa-file-invoice" style="color: var(--warning)"></i>
                    <div><h3>INV-2024-0855</h3><span class="list-card-subtitle">Gamma LLC</span></div>
                </div>
                <span class="status-badge warning">No Discount</span>
            </div>
            <div class="list-card-body summary-body">
                <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">${formatCurrency(15600)}</span></div>
                <div class="detail-row"><span class="detail-label">Payment Terms</span><span class="detail-value">Net 30</span></div>
                <div class="detail-row"><span class="detail-label">Early Pay Discount</span><span class="detail-value" style="color: var(--danger); font-weight: 600;">None — 0%</span></div>
                <div class="detail-row"><span class="detail-label">Exception Type</span><span class="detail-value">Duplicate Entry (matches INV-2024-0821)</span></div>
                <div class="detail-row"><span class="detail-label">Days Overdue</span><span class="detail-value">8 days</span></div>
            </div>
        </div>
        <div class="danger-card">
            <i class="fas fa-ban"></i>
            <div><strong>AI Recommendation: Reject</strong> — No discount offered, and this is a duplicate of INV-2024-0821 which has already been paid. Recommend rejecting to avoid double payment.</div>
        </div>
        <div class="action-buttons">
            <button class="action-btn danger" onclick="sendSuggestion('Reject INV-2024-0855')"><i class="fas fa-times"></i> Reject</button>
            <button class="action-btn secondary" onclick="sendSuggestion('Approve INV-2024-0855 anyway')"><i class="fas fa-check"></i> Approve Anyway</button>
        </div>
    `;
    await addBotMessage(invoiceHTML, 2000);
}

async function handleRejectInvoice1() {
    state.noDiscountStep = 1;
    await addBotMessage(`<div class="danger-card"><i class="fas fa-times-circle"></i><div><strong>INV-2024-0839</strong> rejected — Beta Industries · ${formatCurrency(23400)} · Supplier notified to submit corrected invoice.</div></div><p>Now let's review the second invoice...</p>`, 1500);
    await showNoDiscountInvoice2();
}

async function handleRejectInvoice2() {
    state.noDiscountStep = 2;
    await addBotMessage(`<div class="danger-card"><i class="fas fa-times-circle"></i><div><strong>INV-2024-0855</strong> rejected — Gamma LLC · ${formatCurrency(15600)} · Marked as duplicate, no further action needed.</div></div>`, 1500);
    await showFinalSummary();
}

async function handleApproveInvoice1() {
    state.noDiscountStep = 1;
    await addBotMessage(`<div class="success-card"><i class="fas fa-check-circle"></i><div><strong>INV-2024-0839</strong> approved despite no discount. Proceeding to the next invoice...</div></div>`, 1500);
    await showNoDiscountInvoice2();
}

async function handleApproveInvoice2() {
    state.noDiscountStep = 2;
    await addBotMessage(`<div class="success-card"><i class="fas fa-check-circle"></i><div><strong>INV-2024-0855</strong> approved despite no discount.</div></div>`, 1500);
    await showFinalSummary();
}

async function showFinalSummary() {
    state.conversationPhase = 'completed';
    const totalSavings = (45200 + 32100 + 19800 + 78500) * 0.02;

    const summaryHTML = `
        <p>🎉 <strong>All done!</strong> Here's the complete session summary:</p>
        <div class="joule-list-card final-summary">
            <div class="list-card-header">
                <div class="list-card-title">
                    <i class="fas fa-clipboard-check" style="color: var(--success)"></i>
                    <div><h3>Session Summary</h3><span class="list-card-subtitle">All exceptions processed</span></div>
                </div>
                <span class="status-badge success">Complete</span>
            </div>
            <div class="list-card-body summary-body">
                <div class="detail-row"><span class="detail-label">Total Exceptions Processed</span><span class="detail-value">6</span></div>
                <div class="detail-row"><span class="detail-label">Resolved — Net 30 Applied</span><span class="detail-value" style="color: var(--success)">4 invoices</span></div>
                <div class="detail-row"><span class="detail-label">Auto-Resolved (Business Rule)</span><span class="detail-value">3</span></div>
                <div class="detail-row"><span class="detail-label">Rejected (No Discount)</span><span class="detail-value" style="color: var(--danger)">2 invoices</span></div>
                <div class="detail-row"><span class="detail-label">Business Rule Created</span><span class="detail-value">BR-2026-0142</span></div>
                <div class="detail-row"><span class="detail-label">Total Invoice Amount Processed</span><span class="detail-value">${formatCurrency(78500 + 45200 + 32100 + 19800)}</span></div>
                <div class="detail-row"><span class="detail-label">Total Amount Rejected</span><span class="detail-value" style="color: var(--danger)">${formatCurrency(23400 + 15600)}</span></div>
                <div class="detail-row highlight-row"><span class="detail-label">Total Discount Savings</span><span class="detail-value highlight-green">${formatCurrency(totalSavings)}</span></div>
            </div>
        </div>
        <div class="success-card">
            <i class="fas fa-check-circle"></i>
            <div>Business rule <strong>BR-2026-0142</strong> is active. Rejection notices sent to <strong>Beta Industries</strong>; duplicate for <strong>Gamma LLC</strong> archived.</div>
        </div>
        <p>Is there anything else you'd like me to help with?</p>
        <div class="action-buttons">
            <button class="chip-action" onclick="sendSuggestion('Generate exception report')"><i class="fas fa-file-alt"></i> Generate report</button>
            <button class="chip-action" onclick="sendSuggestion('View active business rules')"><i class="fas fa-list"></i> View business rules</button>
            <button class="chip-action" onclick="sendSuggestion('Start new review')"><i class="fas fa-plus"></i> New review</button>
        </div>
    `;
    await addBotMessage(summaryHTML, 1500);
}

// Generic response
async function handleGenericResponse() {
    const responses = [
        `<p>I can help you with payment exceptions. Try asking me about invoices that need payment exceptions, or tell me about a specific invoice you'd like to resolve.</p>
        <div class="action-buttons"><button class="chip-action" onclick="sendSuggestion('What invoices need payment exceptions for the past 10 days?')"><i class="fas fa-search"></i> Find payment exceptions</button></div>`,
        `<p>I'm not sure I understood that. Here are some things I can help with:</p>
        <ul style="margin:8px 0;padding-left:20px;"><li>Finding invoices with payment exceptions</li><li>Resolving payment term mismatches</li><li>Creating business rules for recurring patterns</li><li>Processing batch invoice updates</li></ul>
        <div class="action-buttons"><button class="chip-action" onclick="sendSuggestion('What invoices need payment exceptions for the past 10 days?')"><i class="fas fa-search"></i> Find exceptions</button></div>`
    ];
    await addBotMessage(responses[Math.floor(Math.random() * responses.length)], 1000);
}