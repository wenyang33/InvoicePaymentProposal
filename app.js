// ========================================
// Invoice Payment Proposal Chat Agent
// ========================================

// State management
const state = {
    currentStep: 0,
    conversationPhase: 'initial', // initial, showing-exceptions, resolve-invoice, business-rule, processing, manual-intervention, completed
    isTyping: false,
    processedInvoices: 0,
    totalInvoices: 0,
    manualStep: 0,       // tracks which flagged invoice (0 or 1) in manual intervention
    rejectedCount: 0,    // how many invoices user rejected
    approvedNoDiscount: 0 // how many no-discount invoices user approved anyway
};

// Sample invoice data (10 invoices, first 3 shown in list)
const invoiceData = [
    { id: 'INV-2024-0847', supplier: 'AA Corp', amount: 78500, dueDate: '2026-04-22', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'critical', daysUntilDue: 7 },
    { id: 'INV-2024-0852', supplier: 'AA Corp', amount: 45200, dueDate: '2026-04-23', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'high', daysUntilDue: 8 },
    { id: 'INV-2024-0839', supplier: 'Beta Industries', amount: 23400, dueDate: '2026-04-05', terms: 'Net 45', exception: 'Overdue', severity: 'critical', daysOverdue: 10 },
    { id: 'INV-2024-0861', supplier: 'AA Corp', amount: 32100, dueDate: '2026-04-24', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'high', daysUntilDue: 9 },
    { id: 'INV-2024-0858', supplier: 'AA Corp', amount: 56800, dueDate: '2026-04-25', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'high', daysUntilDue: 10 },
    { id: 'INV-2024-0863', supplier: 'Gamma Tech', amount: 41300, dueDate: '2026-04-21', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'medium', daysUntilDue: 6 },
    { id: 'INV-2024-0870', supplier: 'AA Corp', amount: 28900, dueDate: '2026-04-26', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'medium', daysUntilDue: 11 },
    { id: 'INV-2024-0874', supplier: 'Delta Supply', amount: 19700, dueDate: '2026-04-20', terms: 'Net 30', exception: 'Terms Mismatch', severity: 'medium', daysUntilDue: 5 },
    { id: 'INV-2024-0881', supplier: 'Epsilon Ltd', amount: 67200, dueDate: '2026-04-28', terms: 'Net 60', exception: 'No Discount Available', severity: 'high', daysUntilDue: 13, noDiscount: true },
    { id: 'INV-2024-0885', supplier: 'Zeta Group', amount: 34500, dueDate: '2026-04-27', terms: 'Net 60', exception: 'No Discount Available', severity: 'medium', daysUntilDue: 12, noDiscount: true },
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
        <div class="message-avatar bot-avatar"><i class="fas fa-wand-magic-sparkles"></i></div>
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
                <div class="message-avatar bot-avatar"><i class="fas fa-wand-magic-sparkles"></i></div>
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
    // Update conversation bar title
    const convTitle = document.querySelector('.conv-title');
    if (convTitle) convTitle.textContent = 'Payment Exceptions';
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
        if (lowerText.includes('reject')) {
            handleRejectInvoice();
        } else if (lowerText.includes('approve')) {
            handleApproveInvoice();
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
    const visibleCount = 3;
    const totalCount = invoiceData.length;

    // Single message: processing card + hidden invoice results
    const combinedHTML = `
        <div class="processing-card" id="processingCard">
            <div class="processing-bar-track"><div class="processing-bar-fill" id="processingBarFill"></div></div>
            <div class="processing-steps">
                <div class="processing-step" id="pStep0" style="opacity:0"><span class="processing-check"><i class="fas fa-check"></i></span><span class="processing-label">Filtering by date range (Apr 5 – Apr 25, 2026)</span><span class="processing-chevron">›</span></div>
                <div class="processing-step" id="pStep1" style="opacity:0"><span class="processing-check"><i class="fas fa-check"></i></span><span class="processing-label">Identifying payment exceptions</span><span class="processing-chevron">›</span></div>
                <div class="processing-step" id="pStep2" style="opacity:0"><span class="processing-check"><i class="fas fa-check"></i></span><span class="processing-label">Severity assessment &amp; ranking</span><span class="processing-chevron">›</span></div>
                <div class="processing-step" id="pStep3" style="opacity:0"><span class="processing-check"><i class="fas fa-check"></i></span><span class="processing-label">Compiling results — <strong>${totalCount} invoices</strong> found</span><span class="processing-chevron">›</span></div>
            </div>
        </div>
        <div id="invoiceResultsSection" style="opacity:0; max-height:0; overflow:hidden; transition: opacity 0.5s ease, max-height 0.6s ease;">
            <div class="joule-list-card" style="margin-top:12px;">
                <div class="list-card-header"><div class="list-card-title"><div><h3>Payment Exceptions</h3><span class="list-card-subtitle">Invoices requiring attention</span></div></div><span class="list-card-count">${visibleCount} of ${totalCount}</span></div>
                <div class="list-card-body">
                    ${invoiceData.slice(0, visibleCount).map((inv) => `
                        <div class="list-card-item">
                            <div class="item-icon"><i class="fas fa-file-invoice"></i></div>
                            <div class="item-content"><span class="item-id">${inv.id}</span><span class="item-supplier">${inv.supplier}</span><span class="item-due">Due ${new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
                            <div class="item-right"><span class="item-exception-label">${inv.exception}</span><button class="item-detail-btn" onclick="event.stopPropagation()">More Details</button></div>
                        </div>
                    `).join('')}
                </div>
                <div class="list-card-footer"><button onclick="sendSuggestion('Yes, let\\'s resolve the most severe one')">Resolve</button><a href="#" onclick="event.preventDefault()">View More</a></div>
            </div>
            <p class="section-header">Recommendation</p>
            <p>The most critical exception is <strong>${invoiceData[0].id}</strong> from <strong>${invoiceData[0].supplier}</strong> for <strong>${formatCurrency(invoiceData[0].amount)}</strong> — a <strong>Terms Mismatch</strong>, due in ${invoiceData[0].daysUntilDue} days. I recommend resolving this one first.</p>
            <div class="action-buttons">
                <button class="action-btn primary" onclick="sendSuggestion('Yes, let\\'s resolve the most severe one')"><i class="fas fa-wrench"></i> Yes, resolve it</button>
                <button class="action-btn secondary" onclick="sendSuggestion('Show me more details')"><i class="fas fa-info-circle"></i> More details</button>
            </div>
        </div>
    `;
    await addBotMessage(combinedHTML, 800);

    // Animate steps one by one
    const stepIds = ['pStep0', 'pStep1', 'pStep2', 'pStep3'];
    const bar = document.getElementById('processingBarFill');
    for (let i = 0; i < stepIds.length; i++) {
        await new Promise(r => setTimeout(r, 700));
        const el = document.getElementById(stepIds[i]);
        if (el) { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }
        if (bar) bar.style.width = ((i + 1) / stepIds.length * 100) + '%';
        scrollToBottom();
    }

    // Reveal invoice results
    await new Promise(r => setTimeout(r, 600));
    const results = document.getElementById('invoiceResultsSection');
    if (results) { results.style.maxHeight = '2000px'; results.style.opacity = '1'; }
    scrollToBottom();
}

// ========================================
// Phase 2: Resolve Invoice - Payment Terms
// ========================================
async function handleResolveMostSevere() {
    state.conversationPhase = 'resolve-invoice';

    const comparisonHTML = `
        <p>Analyzing payment terms for <strong>INV-2024-0847</strong> from <strong>AA Corp</strong> (${formatCurrency(78500)}).</p>
        <p class="section-header">Analysis</p>
        <p>A <strong>terms mismatch</strong> was found — the invoice was submitted under <em>Net 45</em>, but the PO specifies <em>Net 30</em>. Two resolution options are available:</p>
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
        <p class="section-header">Recommendation</p>
        <p><strong>Net 30</strong> with 2% discount saves <strong>${formatCurrency(78500 * 0.02)}</strong> vs ${formatCurrency(78500 * 0.01)} with Net 45. The 10-day discount window fits the current processing timeline.</p>
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
        <p><strong>Confirmed.</strong> Invoice <strong>INV-2024-0847</strong> has been updated with the selected payment terms.</p>
        <div class="reference-card">
            <div class="ref-card-header">
                <a class="ref-card-title">Resolution Applied — INV-2024-0847</a>
                <span class="ref-card-status success">Done</span>
            </div>
            <div class="ref-card-subtitle">Supplier: AA Corp</div>
            <div class="ref-card-subtitle">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Invoice Amount</div>
                <div class="ref-card-field-value">${formatCurrency(78500)}</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Payment Terms</div>
                <div class="ref-card-field-value">Net 30</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Discount Applied</div>
                <div class="ref-card-field-value">2% (10-day window)</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Amount Saved</div>
                <div class="ref-card-field-value highlight-green">${formatCurrency(78500 * 0.02)}</div>
            </div>
            <div class="ref-card-footer"><a href="#" onclick="event.preventDefault()">View Invoice Details</a></div>
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
        <p>I noticed that <strong>7 out of 10 exceptions</strong> follow the same "Terms Mismatch" pattern. Would you like me to create a <strong>business rule</strong> to automatically apply Net 30 with early payment discount to matching invoices?</p>
        <div class="reference-card">
            <div class="ref-card-header">
                <a class="ref-card-title">Proposed Business Rule</a>
                <span class="ref-card-status">Draft</span>
            </div>
            <div class="ref-card-subtitle">Auto-resolve Terms Mismatch exceptions with early payment discount</div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Supplier</div>
                <div class="ref-card-field-value">All suppliers with eligible discount terms</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Exception Type</div>
                <div class="ref-card-field-value">Terms Mismatch (Net 30 vs Net 45)</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Action</div>
                <div class="ref-card-field-value">Auto-select Net 30 with 2% early payment discount</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Discount Window</div>
                <div class="ref-card-field-value">10 days from invoice date</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Threshold</div>
                <div class="ref-card-field-value">Invoices up to $100,000</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Approval</div>
                <div class="ref-card-field-value">Auto-apply (notify AP Manager)</div>
            </div>
            <div class="ref-card-footer"><a href="#" onclick="event.preventDefault()">View Rule Details</a></div>
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
        <div class="reference-card">
            <div class="ref-card-header">
                <a class="ref-card-title">Rule: Terms Mismatch Auto-Resolution</a>
                <span class="ref-card-status success">Active</span>
            </div>
            <div class="ref-card-subtitle">BR-2026-0142</div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Created</div>
                <div class="ref-card-field-value">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Created By</div>
                <div class="ref-card-field-value">Jane Doe (AP Manager)</div>
            </div>
            <div class="ref-card-footer"><a href="#" onclick="event.preventDefault()">View Rule Details</a></div>
        </div>
        <p>Now let me apply this rule to the remaining invoices...</p>
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
    const remainingInvoices = invoiceData.slice(1); // all except the first one (already resolved)
    const autoResolve = remainingInvoices.filter(inv => !inv.noDiscount);
    const flagged = remainingInvoices.filter(inv => inv.noDiscount);
    const totalRemaining = remainingInvoices.length;

    const progressHTML = `
        <p>Applying rule to remaining ${totalRemaining} invoices...</p>
        <div class="progress-container">
            <div class="progress-header-row">
                <span class="progress-label">Processing Invoices</span>
                <span class="progress-count" id="progressCount">0 / ${totalRemaining}</span>
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
        const inv = remainingInvoices[i];
        await new Promise(resolve => setTimeout(resolve, 500));
        const icon = document.getElementById(`progressIcon${i}`);
        icon.className = 'fas fa-spinner fa-spin progress-icon processing';
        await new Promise(resolve => setTimeout(resolve, 400));

        if (inv.noDiscount) {
            // Flagged — warning icon
            icon.className = 'fas fa-exclamation-triangle progress-icon';
            icon.style.color = 'var(--warning)';
        } else {
            // Auto-resolved — check icon
            icon.className = 'fas fa-check-circle progress-icon done';
        }
        const progress = Math.round(((i + 1) / remainingInvoices.length) * 100);
        document.getElementById('progressBar').style.width = progress + '%';
        document.getElementById('progressCount').textContent = `${i + 1} / ${totalRemaining}`;
    }

    // Show result summary
    await new Promise(resolve => setTimeout(resolve, 800));
    const flaggedHTML = `
        <p class="section-header">Processing Complete</p>
        <ul class="bullet-list">
            <li><strong>${autoResolve.length} invoices</strong> auto-resolved — Net 30 with 2% early payment discount applied</li>
            <li><strong>${flagged.length} invoices</strong> flagged — no early payment discount available, manual review required</li>
        </ul>
        <p>Let me walk you through the ${flagged.length} flagged invoices for your decision.</p>
    `;
    await addBotMessage(flaggedHTML, 1500);

    // Transition to manual intervention
    state.conversationPhase = 'manual-intervention';
    state.manualStep = 0;
    await showManualInvoice(0);
}

// ========================================
// Phase 5: Manual Intervention
// ========================================
const flaggedInvoices = () => invoiceData.filter(inv => inv.noDiscount);

async function showManualInvoice(index) {
    const flagged = flaggedInvoices();
    const inv = flagged[index];

    const manualHTML = `
        <p class="section-header">Manual Review Required (${index + 1} of ${flagged.length})</p>
        <p>This invoice does not qualify for early payment discount. The supplier's contract terms (<strong>${inv.terms}</strong>) do not include a discount provision.</p>
        <div class="reference-card">
            <div class="ref-card-header">
                <a class="ref-card-title">${inv.id} — ${inv.supplier}</a>
                <span class="ref-card-status danger">Flagged</span>
            </div>
            <div class="ref-card-subtitle">Due ${new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Invoice Amount</div>
                <div class="ref-card-field-value">${formatCurrency(inv.amount)}</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Payment Terms</div>
                <div class="ref-card-field-value">${inv.terms}</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Early Payment Discount</div>
                <div class="ref-card-field-value highlight-red">Not Available</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Reason</div>
                <div class="ref-card-field-value normal">Supplier contract does not include early payment discount terms. Paying this invoice at full amount provides no cost benefit. Recommend rejecting and renegotiating terms with the supplier.</div>
            </div>
            <div class="ref-card-footer"><a href="#" onclick="event.preventDefault()">View Invoice Details</a></div>
        </div>
        <p class="ai-disclaimer">***System recommendation: Reject this invoice and request updated terms from the supplier.***</p>
        <div class="action-buttons">
            <button class="action-btn danger" onclick="sendSuggestion('Reject invoice ${inv.id}')"><i class="fas fa-times"></i> Reject (Recommended)</button>
            <button class="action-btn secondary" onclick="sendSuggestion('Approve invoice ${inv.id} anyway')"><i class="fas fa-check"></i> Approve Anyway</button>
        </div>
    `;
    await addBotMessage(manualHTML, 1500);
}

async function handleRejectInvoice() {
    const flagged = flaggedInvoices();
    const inv = flagged[state.manualStep];
    state.rejectedCount++;

    await addBotMessage(`
        <div class="danger-card">
            <i class="fas fa-ban"></i>
            <div>Invoice <strong>${inv.id}</strong> from <strong>${inv.supplier}</strong> (${formatCurrency(inv.amount)}) has been <strong>rejected</strong>. A notification has been sent to the supplier requesting updated payment terms.</div>
        </div>
    `, 1200);

    state.manualStep++;
    if (state.manualStep < flagged.length) {
        await showManualInvoice(state.manualStep);
    } else {
        await showFinalSummary();
    }
}

async function handleApproveInvoice() {
    const flagged = flaggedInvoices();
    const inv = flagged[state.manualStep];
    state.approvedNoDiscount++;

    await addBotMessage(`
        <div class="info-card">
            <i class="fas fa-info-circle"></i>
            <div>Invoice <strong>${inv.id}</strong> from <strong>${inv.supplier}</strong> (${formatCurrency(inv.amount)}) has been <strong>approved</strong> at full amount with no early payment discount.</div>
        </div>
    `, 1200);

    state.manualStep++;
    if (state.manualStep < flagged.length) {
        await showManualInvoice(state.manualStep);
    } else {
        await showFinalSummary();
    }
}

// ========================================
// Phase 5: Final Summary
// ========================================
async function showFinalSummary() {
    state.conversationPhase = 'completed';
    const autoResolved = invoiceData.filter(inv => !inv.noDiscount).length - 1; // minus the one resolved manually
    const totalDiscountInvoices = invoiceData.filter(inv => !inv.noDiscount);
    const totalSavings = totalDiscountInvoices.reduce((sum, inv) => sum + inv.amount * 0.02, 0);

    const summaryHTML = `
        <p><strong>All done.</strong> Here is the complete session summary:</p>
        <div class="reference-card">
            <div class="ref-card-header">
                <a class="ref-card-title">Session Summary</a>
                <span class="ref-card-status success">Complete</span>
            </div>
            <div class="ref-card-subtitle">All ${invoiceData.length} exceptions processed</div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Total Exceptions Processed</div>
                <div class="ref-card-field-value">${invoiceData.length}</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Manually Resolved</div>
                <div class="ref-card-field-value">1 invoice (INV-2024-0847)</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Auto-Resolved (Business Rule)</div>
                <div class="ref-card-field-value">${autoResolved} invoices</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Rejected (No Discount)</div>
                <div class="ref-card-field-value highlight-red">${state.rejectedCount} invoice${state.rejectedCount !== 1 ? 's' : ''}</div>
            </div>
            ${state.approvedNoDiscount > 0 ? `<div class="ref-card-field">
                <div class="ref-card-field-label">Approved Without Discount</div>
                <div class="ref-card-field-value">${state.approvedNoDiscount} invoice${state.approvedNoDiscount !== 1 ? 's' : ''}</div>
            </div>` : ''}
            <div class="ref-card-field">
                <div class="ref-card-field-label">Business Rule Created</div>
                <div class="ref-card-field-value">BR-2026-0142</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Total Invoice Amount Processed</div>
                <div class="ref-card-field-value">${formatCurrency(invoiceData.reduce((sum, inv) => sum + inv.amount, 0))}</div>
            </div>
            <div class="ref-card-field">
                <div class="ref-card-field-label">Total Discount Savings</div>
                <div class="ref-card-field-value highlight-green">${formatCurrency(totalSavings)}</div>
            </div>
            <div class="ref-card-footer"><a href="#" onclick="event.preventDefault()">View Full Report</a></div>
        </div>
        <div class="success-card">
            <i class="fas fa-check-circle"></i>
            <div>Business rule <strong>BR-2026-0142</strong> is active and will auto-resolve future Terms Mismatch exceptions.${state.rejectedCount > 0 ? ` <strong>${state.rejectedCount}</strong> rejected invoice${state.rejectedCount !== 1 ? 's' : ''} — suppliers have been notified to submit updated terms.` : ''}</div>
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
        <div class="action-buttons"><button class="chip-action" onclick="sendSuggestion('What invoices I received in the past 10 days have payment exceptions?')"><i class="fas fa-search"></i> Find payment exceptions</button></div>`,
        `<p>I'm not sure I understood that. Here are some things I can help with:</p>
        <ul style="margin:8px 0;padding-left:20px;"><li>Finding invoices with payment exceptions</li><li>Resolving payment term mismatches</li><li>Creating business rules for recurring patterns</li><li>Processing batch invoice updates</li></ul>
        <div class="action-buttons"><button class="chip-action" onclick="sendSuggestion('What invoices I received in the past 10 days have payment exceptions?')"><i class="fas fa-search"></i> Find exceptions</button></div>`
    ];
    await addBotMessage(responses[Math.floor(Math.random() * responses.length)], 1000);
}