// app.js — Frontend logic for Appointment Reminder System

// ---- SUBMIT APPOINTMENT ----
async function submitAppointment() {
  const btn = document.getElementById('submitBtn');
  const toast = document.getElementById('toast');

  const name      = document.getElementById('name').value.trim();
  const phone     = document.getElementById('phone').value.trim();
  const apptTime  = document.getElementById('appt_time').value;
  const notes     = document.getElementById('notes').value.trim();

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
async function loadAppointments() {
  const container = document.getElementById('tableContainer');
  document.getElementById('lastRefresh').textContent = 'Refreshing...';

  try {
    const response = await fetch(`${CONFIG.BACKEND_URL}/api/appointments`);
    const appointments = await response.json();

    if (!response.ok) throw new Error(appointments.error || 'Failed to load');

    renderTable(appointments);
    document.getElementById('lastRefresh').textContent =
      `Last updated: ${new Date().toLocaleTimeString()}`;

  } catch (err) {
    container.innerHTML = `<div class="empty">⚠️ Could not load appointments.<br><small>${err.message}</small></div>`;
    document.getElementById('lastRefresh').textContent = 'Error loading data';
  }
}

function renderTable(appointments) {
  const container = document.getElementById('tableContainer');

  if (!appointments.length) {
    container.innerHTML = '<div class="empty">No appointments yet.<br>Book one using the form!</div>';
    return;
  }

  const now = new Date();

  const rows = appointments.map(appt => {
    const apptDate = new Date(appt.appt_time);
    const diffMs = apptDate - now;
    const diffMin = Math.floor(diffMs / 60000);

    let statusLabel, statusClass;
    if (appt.message_status === 'sent') {
      statusLabel = 'Msg Sent';
      statusClass = 'status-sent';
    } else if (diffMin > 0 && diffMin <= 60) {
      statusLabel = 'In < 1 hr';
      statusClass = 'status-upcoming';
    } else {
      statusLabel = 'Pending';
      statusClass = 'status-pending';
    }

    const dateStr = apptDate.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    return `
      <tr>
        <td><strong>${escHtml(appt.customer_name)}</strong>${appt.notes ? `<div class="meta">${escHtml(appt.notes)}</div>` : ''}</td>
        <td>${escHtml(appt.phone)}</td>
        <td>${dateStr}</td>
        <td><span class="status ${statusClass}">${statusLabel}</span></td>
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

// ---- AUTO-REFRESH EVERY 30 SECONDS ----
loadAppointments();
setInterval(loadAppointments, 30000);
