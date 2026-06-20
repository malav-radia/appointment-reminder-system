// app.js — Frontend logic for Appointment Reminder System

// ---- SUBMIT APPOINTMENT ----
async function submitAppointment() {
    const btn = document.getElementById('submitBtn');
    const toast = document.getElementById('toast');

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const apptTime = document.getElementById('appt_time').value;
    const notes = document.getElementById('notes').value.trim();

    // Basic validation
    if (!name || !phone || !apptTime) {
        showToast('Please fill in Name, Phone, and Appointment Time.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving & Sending...';
    toast.className = 'toast';
    toast.style.display = 'none';

    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, appt_time: apptTime, notes })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || 'Server error');

        showToast(`✅ Appointment saved! Confirmation message sent to ${phone}.`, 'success');

        // Clear form
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('appt_time').value = '';
        document.getElementById('notes').value = '';

        // Refresh dashboard
        loadAppointments();

    } catch (err) {
        showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Book & Send Confirmation';
    }
}

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type}`;
}

// ---- LOAD APPOINTMENTS DASHBOARD ----
let allAppointments = []; // store latest fetched data globally for client-side filtering

async function loadAppointments() {
    const container = document.getElementById('tableContainer');
    document.getElementById('lastRefresh').textContent = 'Refreshing...';

    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/appointments`);
        const appointments = await response.json();

        if (!response.ok) throw new Error(appointments.error || 'Failed to load');

        allAppointments = appointments; // save globally so search/filter doesn't need a new fetch
        applyFilters(); // render with current search/filter applied

        document.getElementById('lastRefresh').textContent =
            `Last updated: ${new Date().toLocaleTimeString()}`;

    } catch (err) {
        container.innerHTML = `<div class="empty">⚠️ Could not load appointments.<br><small>${err.message}</small></div>`;
        document.getElementById('lastRefresh').textContent = 'Error loading data';
    }
}

// ---- SEARCH & STATUS FILTER ----
function applyFilters() {
    const searchBox = document.getElementById('searchBox');
    const statusFilter = document.getElementById('statusFilter');

    const searchTerm = searchBox ? searchBox.value.toLowerCase().trim() : '';
    const statusValue = statusFilter ? statusFilter.value : 'all';

    let filtered = allAppointments;

    if (searchTerm) {
        filtered = filtered.filter(appt =>
            (appt.customer_name || '').toLowerCase().includes(searchTerm) ||
            (appt.phone || '').toLowerCase().includes(searchTerm)
        );
    }

    if (statusValue !== 'all') {
        filtered = filtered.filter(appt => (appt.status || 'pending') === statusValue);
    }

    renderTable(filtered);
}

function renderTable(appointments) {
    const container = document.getElementById('tableContainer');

    if (!appointments.length) {
        container.innerHTML = '<div class="empty">No matching appointments.</div>';
        return;
    }

    const now = new Date();

    const rows = appointments.map(appt => {
                const apptDate = new Date(appt.appt_time);
                const diffMs = apptDate - now;
                const diffMin = Math.floor(diffMs / 60000);

                const currentStatus = appt.status || 'pending';
                let statusLabel, statusClass;

                if (currentStatus === 'confirmed') {
                    statusLabel = 'Confirmed';
                    statusClass = 'status-confirmed';
                } else if (currentStatus === 'cancelled') {
                    statusLabel = 'Cancelled';
                    statusClass = 'status-cancelled';
                } else if (currentStatus === 'no_response') {
                    statusLabel = 'No Response';
                    statusClass = 'status-no_response';
                } else if (appt.message_status === 'sent' && diffMin > 0 && diffMin <= 60) {
                    statusLabel = 'In < 1 hr';
                    statusClass = 'status-upcoming';
                } else if (appt.message_status === 'sent') {
                    statusLabel = 'Msg Sent';
                    statusClass = 'status-sent';
                } else {
                    statusLabel = 'Pending';
                    statusClass = 'status-pending';
                }

                const dateStr = apptDate.toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                return `
      <tr>
        <td><strong>${escHtml(appt.customer_name)}</strong>${appt.notes ? `<div class="meta">${escHtml(appt.notes)}</div>` : ''}</td>
        <td>${escHtml(appt.phone)}</td>
        <td>${dateStr}</td>
        <td><span class="status ${statusClass}">${statusLabel}</span></td>
        <td>
          <button class="action-btn edit-btn" onclick="openEditModal(${appt.id})">Edit</button>
          <button class="action-btn cancel-btn" onclick="cancelAppointment(${appt.id})">Cancel</button>
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Phone</th>
          <th>Appointment Time</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

// ---- EDIT APPOINTMENT ----
function openEditModal(id) {
    const appt = allAppointments.find(a => a.id === id);
    if (!appt) return;

    document.getElementById('editId').value = appt.id;
    document.getElementById('editName').value = appt.customer_name;
    document.getElementById('editPhone').value = appt.phone;
    document.getElementById('editNotes').value = appt.notes || '';

    // Convert ISO time to datetime-local format
    const localDateTime = new Date(appt.appt_time);
    const offset = localDateTime.getTimezoneOffset();
    const adjusted = new Date(localDateTime.getTime() - offset * 60000);
    document.getElementById('editApptTime').value = adjusted.toISOString().slice(0, 16);

    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveEdit() {
    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const appt_time = document.getElementById('editApptTime').value;
    const notes = document.getElementById('editNotes').value.trim();

    if (!name || !phone || !appt_time) {
        alert('Please fill in all required fields.');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/appointments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, appt_time, notes })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to update');
        }

        closeEditModal();
        loadAppointments();

    } catch (err) {
        alert(`Error updating appointment: ${err.message}`);
    }
}

// ---- CANCEL APPOINTMENT ----
async function cancelAppointment(id) {
    if (!confirm('Cancel this appointment? The customer will be notified.')) return;

    try {
        const response = await fetch(`${CONFIG.BACKEND_URL}/api/appointments/${id}/cancel`, {
            method: 'PATCH',
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to cancel');
        }

        loadAppointments();

    } catch (err) {
        alert(`Error cancelling appointment: ${err.message}`);
    }
}

// ---- AUTO-REFRESH EVERY 30 SECONDS ----
loadAppointments();
setInterval(loadAppointments, 30000);