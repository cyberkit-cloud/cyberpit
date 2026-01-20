let autoRefreshInterval = null;

// Helper function to escape HTML to prevent breaking the UI
function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Load version from API
async function loadVersion() {
    try {
        const response = await fetch("/api/version");
        const data = await response.json();
        document.getElementById("version").textContent = `v${data.version}`;
    } catch (error) {
        console.error("Error loading version:", error);
        document.getElementById("version").textContent = "";
    }
}

async function loadRequests() {
    try {
        const response = await fetch("/api/logs");
        const data = await response.json();

        document.getElementById("totalRequests").textContent = data.total;
        document.getElementById("inMemory").textContent = data.requests.length;

        const listEl = document.getElementById("requestsList");

        if (data.requests.length === 0) {
            listEl.innerHTML =
                '<div class="empty-state">No requests logged yet</div>';
            return;
        }

        listEl.innerHTML = data.requests
            .map((req) => {
                const date = new Date(req.timestamp);

                // Determine status class and text
                let statusClass, statusText;
                if (req.status) {
                    statusClass = `status-${req.status}`;
                    statusText = req.status.charAt(0).toUpperCase() + req.status.slice(1);
                } else if (req.response) {
                    statusClass =
                        req.response.status >= 500
                            ? "status-5xx"
                            : req.response.status >= 400
                                ? "status-4xx"
                                : "status-2xx";
                    statusText = req.response.status;
                } else {
                    statusClass = "status-pending";
                    statusText = "Pending";
                }

                return `
        <div class="request-item" onclick="showDetails('${req.id}')">
          <div class="request-header">
            <div>
              <span class="request-method method-${req.method}">${req.method}</span>
              <span class="request-url">${req.url}</span>
            </div>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="request-time">
            ${date.toLocaleString()}${req.user ? ` • /${req.user}/${req.endpointHash}` : ""}
            ${req.response ? ` • ${req.response.duration}ms` : ""}
          </div>
        </div>
      `;
            })
            .join("");
    } catch (error) {
        console.error("Error loading requests:", error);
    }
}

async function showDetails(id) {
    try {
        const response = await fetch(`/api/logs/${id}`);
        const req = await response.json();

        const date = new Date(req.timestamp);

        let html = `
      <div class="detail-section">
        <div class="detail-title">Request Info</div>
        <div class="detail-content">
          <strong>ID:</strong> ${req.id}<br>
          <strong>Time:</strong> ${date.toLocaleString()}<br>
          <strong>Method:</strong> ${req.method}<br>
          <strong>URL:</strong> ${req.url}
          ${req.user ? `<br><strong>User:</strong> ${req.user}` : ""}
          ${req.endpointHash ? `<br><strong>Endpoint:</strong> ${req.endpointHash}` : ""}
        </div>
      </div>
      
      <div class="detail-section">
        <div class="detail-title">Headers</div>
        <div class="detail-content"><pre>${JSON.stringify(req.headers, null, 2)}</pre></div>
      </div>
      
      <div class="detail-section">
        <div class="detail-title">Body</div>
        <div class="detail-content"><pre>${req.body ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body, null, 2)) : req.rawBody || "No body"}</pre></div>
      </div>
    `;

        if (req.response) {
            const responseBodyHtml = req.response.body
                ? "<br><pre>" +
                escapeHtml(JSON.stringify(req.response.body, null, 2)) +
                "</pre>"
                : "";
            html += `
        <div class="detail-section">
          <div class="detail-title">Response</div>
          <div class="detail-content">
            <strong>Status:</strong> ${req.response.status}<br>
            <strong>Duration:</strong> ${req.response.duration}ms<br>
            ${responseBodyHtml}
          </div>
        </div>
      `;
        }

        if (req.fanoutResults && req.fanoutResults.length > 0) {
            html += `
        <div class="detail-section">
          <div class="detail-title">Fanout Results (${req.fanoutResults.length} endpoints)</div>
      `;

            req.fanoutResults.forEach((result, idx) => {
                const statusClass = result.response.error
                    ? "status-5xx"
                    : result.response.status >= 500
                        ? "status-5xx"
                        : result.response.status >= 400
                            ? "status-4xx"
                            : "status-2xx";
                const statusText = result.response.error
                    ? "Error"
                    : result.response.status;

                const errorHtml = result.response.error
                    ? "<strong>Error:</strong> " +
                    escapeHtml(result.response.message) +
                    "<br>"
                    : "";
                const bodyContent = result.response.body
                    ? typeof result.response.body === "string"
                        ? result.response.body
                        : JSON.stringify(result.response.body, null, 2)
                    : "";
                const bodyHtml = bodyContent
                    ? "<details><summary>Response Body</summary><pre>" +
                    escapeHtml(bodyContent) +
                    "</pre></details>"
                    : "";

                html += `
          <div class="detail-content" style="margin-bottom: 10px;">
            <strong>Endpoint ${idx + 1}:</strong> ${escapeHtml(result.url)}<br>
            <strong>Status:</strong> <span class="status-badge ${statusClass}">${statusText}</span><br>
            <strong>Duration:</strong> ${result.ms}ms<br>
            ${errorHtml}
            ${bodyHtml}
          </div>
        `;
            });

            html += `</div>`;
        }

        // Add replay button
        html += `
            <div style="margin-top: 20px;">
                <button onclick="replayRequest('${req.id}')" style="background: #8b5cf6;">🔁 Replay Request</button>
            </div>
        `;

        document.getElementById("modalTitle").textContent =
            `Request ${req.method} - ${req.id.substring(0, 8)}`;
        document.getElementById("modalBody").innerHTML = html;
        document.getElementById("detailModal").classList.add("active");
    } catch (error) {
        console.error("Error loading request details:", error);
    }
}

function closeModal() {
    document.getElementById("detailModal").classList.remove("active");
}

async function clearLogs() {
    if (confirm("Are you sure you want to clear all logs?")) {
        try {
            await fetch("/api/logs", { method: "DELETE" });
            loadRequests();
        } catch (error) {
            console.error("Error clearing logs:", error);
        }
    }
}

function toggleAutoRefresh() {
    const enabled = document.getElementById("autoRefresh").checked;
    if (enabled) {
        autoRefreshInterval = setInterval(loadRequests, 3000);
    } else {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }
}

async function showConfigEditor() {
    try {
        // Show modal first
        document.getElementById("configModal").classList.add("active");

        // Load config from server
        await loadConfigIntoEditor();
    } catch (error) {
        console.error("Error opening configuration editor:", error);
        alert("Error opening configuration editor: " + error.message);
    }
}

async function loadConfigIntoEditor() {
    try {
        const statusEl = document.getElementById("configStatus");
        statusEl.textContent = "Loading configuration from server...";
        statusEl.style.color = "#60a5fa";
        statusEl.style.display = "block";

        const response = await fetch("/api/config");
        const config = await response.json();
        document.getElementById("configEditor").value = JSON.stringify(
            config,
            null,
            2,
        );

        statusEl.textContent = "✓ Configuration loaded from server";
        statusEl.style.color = "#10b981";
        setTimeout(() => {
            statusEl.style.display = "none";
        }, 2000);
    } catch (error) {
        console.error("Error loading configuration:", error);
        const statusEl = document.getElementById("configStatus");
        statusEl.textContent = "Error loading configuration: " + error.message;
        statusEl.style.color = "#ef4444";
        statusEl.style.display = "block";
    }
}

function closeConfigModal() {
    document.getElementById("configModal").classList.remove("active");
}

async function saveConfiguration() {
    try {
        const statusEl = document.getElementById("configStatus");
        const configText = document.getElementById("configEditor").value;
        const config = JSON.parse(configText);

        statusEl.textContent = "Saving configuration...";
        statusEl.style.color = "#60a5fa";
        statusEl.style.display = "block";

        const response = await fetch("/api/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
        });
        const result = await response.json();

        statusEl.textContent = "✓ Configuration saved successfully!";
        statusEl.style.color = "#10b981";
        setTimeout(() => {
            statusEl.style.display = "none";
        }, 3000);
    } catch (error) {
        console.error("Error saving configuration:", error);
        const statusEl = document.getElementById("configStatus");
        statusEl.textContent = "Error: " + error.message;
        statusEl.style.color = "#ef4444";
        statusEl.style.display = "block";
    }
}

async function downloadConfigFromModal() {
    try {
        const response = await fetch("/api/config/download");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cyberpit-config-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error("Error downloading config:", error);
        alert("Error downloading config: " + error.message);
    }
}

async function uploadConfigFromModal(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const statusEl = document.getElementById("configStatus");
        statusEl.textContent = "Uploading configuration...";
        statusEl.style.color = "#60a5fa";
        statusEl.style.display = "block";

        const text = await file.text();
        const config = JSON.parse(text);

        // Update the editor
        document.getElementById("configEditor").value = JSON.stringify(
            config,
            null,
            2,
        );

        const response = await fetch("/api/config/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
        });
        const result = await response.json();

        statusEl.textContent = "✓ Configuration uploaded and loaded into editor!";
        statusEl.style.color = "#10b981";
        setTimeout(() => {
            statusEl.style.display = "none";
        }, 3000);

        event.target.value = ""; // Reset file input
    } catch (error) {
        console.error("Error uploading config:", error);
        const statusEl = document.getElementById("configStatus");
        statusEl.textContent = "Error: " + error.message;
        statusEl.style.color = "#ef4444";
        statusEl.style.display = "block";
        event.target.value = "";
    }
}

async function downloadLogs() {
    try {
        const response = await fetch("/api/logs/download");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cyberpit-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error("Error downloading logs:", error);
        alert("Error downloading logs: " + error.message);
    }
}

async function uploadLogs(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const logsData = JSON.parse(text);
        const response = await fetch("/api/logs/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(logsData),
        });
        const result = await response.json();
        alert(result.message);
        loadRequests();
        event.target.value = ""; // Reset file input
    } catch (error) {
        console.error("Error uploading logs:", error);
        alert("Error uploading logs: " + error.message);
    }
}

async function replayRequest(id) {
    if (!confirm("Are you sure you want to replay this request?")) {
        return;
    }

    try {
        const response = await fetch(`/api/logs/${id}/replay`, {
            method: "POST",
        });
        const result = await response.json();
        alert(`Request replayed successfully! New request ID: ${result.replayId}`);
        closeModal();
        loadRequests();
    } catch (error) {
        console.error("Error replaying request:", error);
        alert("Error replaying request: " + error.message);
    }
}

// Close modal when clicking outside
document.getElementById("detailModal").addEventListener("click", function (e) {
    if (e.target === this) closeModal();
});

document.getElementById("configModal").addEventListener("click", function (e) {
    if (e.target === this) closeConfigModal();
});

// Load requests on page load and enable auto-refresh by default
loadVersion();
loadRequests();
toggleAutoRefresh();
