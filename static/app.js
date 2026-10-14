const $ = (id) => document.getElementById(id);

let attendanceData = [];

function listFrom(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, 3500);
}

async function api(path) {
  const response = await fetch(path);
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText} — ${path}`);
  return response.json();
}

function esc(value) {
  return String(value ?? "—").replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch],
  );
}

function renderAttendance() {
  const query = $("searchInput").value.trim().toLowerCase();
  const rows = attendanceData.filter((row) =>
    [row.emp_code, row.name, row.status, row.date].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(query),
    ),
  );

  $("attendanceRows").innerHTML = rows.length
    ? rows
        .map((row) => {
          const status = String(row.status ?? "—").toLowerCase();
          const hours =
            row.work_hours == null ? "—" : Number(row.work_hours).toFixed(2);
          return `<tr>
      <td><strong>${esc(row.name || row.emp_code)}</strong><br><small>${esc(row.emp_code)}</small></td>
      <td>${esc(row.date)}</td>
      <td><span class="status ${esc(status)}">${esc(row.status)}</span></td>
      <td>${hours}</td>
      <td>${Number(row.late_minutes || 0)}</td>
    </tr>`;
        })
        .join("")
    : `<tr><td colspan="5" class="empty">No matching attendance records.</td></tr>`;

  $("tableFooter").textContent =
    `Showing ${rows.length} of ${attendanceData.length} records loaded`;
}

async function loadDashboard() {
  $("apiStatus").textContent = "Connecting…";
  $("refreshBtn").disabled = true;

  try {
    const month = $("monthFilter").value || "2026-07";
    const [
      health,
      employeesResult,
      attendanceResult,
      departmentsResult,
      leaderboardResult,
    ] = await Promise.all([
      api("/health"),
      api("/employees?page=1&page_size=100"),
      api("/attendance?page=1&page_size=100"),
      api(`/analytics/departments/summary?month=${encodeURIComponent(month)}`),
      api(
        `/analytics/leaderboard/late?month=${encodeURIComponent(month)}&limit=10`,
      ),
    ]);

    $("apiStatus").textContent =
      health.status === "ok" ? "Connected" : "Check API";
    const employees = listFrom(employeesResult, [
      "items",
      "employees",
      "results",
      "data",
    ]);
    attendanceData = listFrom(attendanceResult, [
      "items",
      "attendance",
      "records",
      "results",
      "data",
    ]);

    $("employeeCount").textContent =
      employeesResult.total ?? employeesResult.total_count ?? employees.length;
    $("recordCount").textContent =
      attendanceResult.total ??
      attendanceResult.total_count ??
      attendanceData.length;

    const presentStatuses = ["PRESENT", "WFH", "ON_DUTY"];
    $("presentCount").textContent = attendanceData.filter((r) =>
      presentStatuses.includes(String(r.status).toUpperCase()),
    ).length;
    $("lateCount").textContent = attendanceData.filter(
      (r) => Number(r.late_minutes) > 0,
    ).length;

    const departments = listFrom(departmentsResult, [
      "departments",
      "items",
      "data",
    ]);
    $("departmentRows").innerHTML = departments.length
      ? departments
          .map(
            (d) => `
      <tr>
        <td><strong>${esc(d.department)}</strong></td>
        <td>${esc(d.headcount)}</td>
        <td>${esc(d.present_days)}</td>
        <td>${esc(d.late_count)}</td>
      </tr>`,
          )
          .join("")
      : `<tr><td colspan="4" class="empty">No department summary data for ${esc(month)}.</td></tr>`;

    const leaders = listFrom(leaderboardResult, [
      "leaderboard",
      "items",
      "data",
    ]);
    $("leaderboard").innerHTML = leaders.length
      ? leaders
          .map(
            (person) => `
      <div class="leaderboard-item">
        <div class="rank">${esc(person.rank)}</div>
        <div class="person"><strong>${esc(person.name || person.emp_code)}</strong>
          <small>${esc(person.department)} · ${esc(person.emp_code)}</small></div>
        <div class="minutes">${esc(person.total_late_minutes)} min</div>
      </div>`,
          )
          .join("")
      : `<p class="empty">No late arrivals found for this month.</p>`;

    renderAttendance();
  } catch (error) {
    $("apiStatus").textContent = "Connection issue";
    showToast("Dashboard could not load: " + error.message);
    console.error(error);
  } finally {
    $("refreshBtn").disabled = false;
  }
}

$("refreshBtn").addEventListener("click", loadDashboard);
$("monthFilter").addEventListener("change", loadDashboard);
$("searchInput").addEventListener("input", renderAttendance);

loadDashboard();
