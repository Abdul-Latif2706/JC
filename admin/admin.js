
/* ==========================================
   JONNIE'S CUTZ — ADMIN DASHBOARD
   Supabase Booking Management
========================================== */

const SUPABASE_URL = "https://ibcavfsjdlsknlcottrt.supabase.co";
const SUPABASE_KEY = "sb_publishable_6jjLWXliu2vHwjBmwnvz0w_SlXLleM3";

const ADMIN_EMAIL = "jonniescutz@gmail.com";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let allBookings = [];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function showMessage(message) {
    const element = document.getElementById("dashboard-message");
    if (element) element.textContent = message;
}

// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

async function verifyAdmin() {
    const { data: { session }, error } =
        await supabaseClient.auth.getSession();

    if (error || !session || session.user.email !== ADMIN_EMAIL) {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return false;
    }

    const { data, error: adminError } =
        await supabaseClient.rpc("is_admin");

    if (adminError || data !== true) {
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
        return false;
    }

    const emailElement =
        document.getElementById("admin-email-display");

    if (emailElement) {
        emailElement.textContent = session.user.email;
    }

    return true;
}

// ==========================================
// DATE AND TIME HELPERS
// ==========================================

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(date) {
    if (!date) return "—";

    return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatTime(time) {
    if (!time) return "—";

    const [hours, minutes] = time.split(":");
    const date = new Date();

    date.setHours(Number(hours), Number(minutes), 0);

    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
    });
}

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function updateStatistics() {
    const today = localDateString();

    const confirmed = allBookings.filter(
        booking => booking.status?.toLowerCase() === "confirmed"
    );

    const todayBookings = allBookings.filter(
        booking => booking.booking_date === today
    );

    const upcoming = confirmed.filter(
        booking => booking.booking_date >= today
    );

    const completed = allBookings.filter(
        booking => booking.status?.toLowerCase() === "completed"
    );

    const cancelled = allBookings.filter(
        booking => booking.status?.toLowerCase() === "cancelled"
    );

    document.getElementById("total-count").textContent =
        allBookings.length;

    document.getElementById("today-count").textContent =
        todayBookings.length;

    document.getElementById("upcoming-count").textContent =
        upcoming.length;

    document.getElementById("completed-count").textContent =
        completed.length;

    document.getElementById("cancelled-count").textContent =
        cancelled.length;
}

// ==========================================
// SEARCH AND FILTER BOOKINGS
// ==========================================

function renderBookings() {
    const body = document.getElementById("appointments-body");

    const search = document.getElementById("search-bookings")
        .value.trim().toLowerCase();

    const dateFilter =
        document.getElementById("filter-date").value;

    const statusFilter =
        document.getElementById("filter-status").value;

    const branchFilter =
        document.getElementById("filter-branch").value;

    const filtered = allBookings.filter(booking => {

        const searchable = [
            booking.customer_name,
            booking.customer_email,
            booking.phone,
            booking.service,
            booking.barber,
            booking.branch
        ].join(" ").toLowerCase();

        const matchesSearch = searchable.includes(search);

        const matchesDate =
            !dateFilter || booking.booking_date === dateFilter;

        const matchesStatus =
            statusFilter === "all" ||
            booking.status?.toLowerCase() === statusFilter;

        const matchesBranch =
            branchFilter === "all" ||
            booking.branch === branchFilter;

        return matchesSearch &&
            matchesDate &&
            matchesStatus &&
            matchesBranch;
    });

    if (!filtered.length) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    No appointments match your filters.
                </td>
            </tr>
        `;
    } else {

        body.innerHTML = filtered.map(booking => {

            const status =
                (booking.status || "pending").toLowerCase();

            return `
                <tr>

                    <td>
                        <span class="customer-name">
                            ${escapeHTML(booking.customer_name)}
                        </span>

                        <span class="customer-phone">
                            ${escapeHTML(booking.phone)}
                        </span>

                        <span class="customer-email">
                            ${escapeHTML(
                                booking.customer_email || "Email not available"
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(booking.service)}
                    </td>

                    <td>
                        ${escapeHTML(booking.branch || "—")}

                        <br>

                        <span class="customer-phone">
                            ${escapeHTML(booking.barber || "—")}
                        </span>
                    </td>

                    <td>
                        ${formatDate(booking.booking_date)}

                        <br>

                        <span class="customer-phone">
                            ${formatTime(booking.booking_time)}
                        </span>
                    </td>

                    <td>
                        <span class="status-label status-${escapeHTML(status)}">
                            ${escapeHTML(status)}
                        </span>
                    </td>

                    <td>
                        <select
                            class="status-select"
                            data-booking-id="${escapeHTML(booking.id)}"
                            aria-label="Change booking status">

                            ${["confirmed", "pending", "completed", "cancelled"]
                                .map(option => `
                                    <option
                                        value="${option}"
                                        ${status === option ? "selected" : ""}>
                                        ${option.charAt(0).toUpperCase() + option.slice(1)}
                                    </option>
                                `).join("")}

                        </select>
                    </td>

                </tr>
            `;
        }).join("");
    }

    document.getElementById("booking-results").textContent =
        `Showing ${filtered.length} of ${allBookings.length} appointments`;
}

// ==========================================
// LOAD BOOKINGS
// ==========================================

async function loadBookings() {
    showMessage("Loading appointments...");

    const { data, error } = await supabaseClient
        .from("bookings")
        .select("*")
        .order("booking_date", { ascending: false })
        .order("booking_time", { ascending: true });

    if (error) {
        console.error("Booking loading error:", error);

        showMessage(
            "Unable to load appointments: " + error.message
        );

        return;
    }

    allBookings = data || [];

    updateStatistics();
    renderBookings();

    showMessage("");
}

// ==========================================
// UPDATE BOOKING STATUS
// ==========================================

async function changeBookingStatus(event) {
    const select = event.target;

    if (!select.matches(".status-select")) return;

    const id = select.dataset.bookingId;
    const newStatus = select.value;

    select.disabled = true;

    showMessage("Updating appointment...");

    const { error } = await supabaseClient
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", id);

    if (error) {
        console.error("Status update error:", error);

        showMessage(
            "Status update failed: " + error.message
        );

        await loadBookings();

    } else {
        showMessage("Appointment status updated successfully.");

        await loadBookings();
    }
}

// ==========================================
// LOGIN
// ==========================================

async function verifyLoginSession() {
    const { data: { session }, error } =
        await supabaseClient.auth.getSession();

    if (error || !session) return false;

    if (session.user.email !== ADMIN_EMAIL) {
        await supabaseClient.auth.signOut();
        return false;
    }

    const { data, error: adminError } =
        await supabaseClient.rpc("is_admin");

    if (adminError || data !== true) {
        await supabaseClient.auth.signOut();
        return false;
    }

    return true;
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById("admin-email")
        .value.trim().toLowerCase();

    const password =
        document.getElementById("admin-password").value;

    const button =
        document.getElementById("login-button");

    const message =
        document.getElementById("login-message");

    message.textContent = "";

    if (email !== ADMIN_EMAIL) {
        message.textContent = "This email is not authorised.";
        return;
    }

    button.disabled = true;

    button.querySelector("span").textContent = "Signing in...";

    try {
        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

        if (error) throw error;

        const { data, error: adminError } =
            await supabaseClient.rpc("is_admin");

        if (adminError || data !== true) {
            await supabaseClient.auth.signOut();

            throw new Error(
                "Administrator access could not be verified."
            );
        }

        window.location.href = "dashboard.html";

    } catch (error) {

        message.textContent =
            error.message || "Unable to sign in. Please try again.";

    } finally {

        button.disabled = false;

        button.querySelector("span").textContent = "Sign In";
    }
}

// ==========================================
// LOGOUT
// ==========================================

async function logout() {
    await supabaseClient.auth.signOut();

    window.location.href = "login.html";
}

// ==========================================
// INITIALISE DASHBOARD
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    const page = document.body.dataset.page;

    if (page === "login") {

        const form =
            document.getElementById("admin-login-form");

        if (form) {
            form.addEventListener("submit", handleLogin);
        }

        if (await verifyLoginSession()) {
            window.location.href = "dashboard.html";
        }
    }

    if (page === "dashboard") {

        const authorised = await verifyAdmin();

        if (!authorised) return;

        document.getElementById("logout-button")
            .addEventListener("click", logout);

        document.getElementById("refresh-button")
            .addEventListener("click", loadBookings);

        document.getElementById("appointments-body")
            .addEventListener("change", changeBookingStatus);

        document.getElementById("search-bookings")
            .addEventListener("input", renderBookings);

        document.getElementById("filter-date")
            .addEventListener("change", renderBookings);

        document.getElementById("filter-status")
            .addEventListener("change", renderBookings);

        document.getElementById("filter-branch")
            .addEventListener("change", renderBookings);

        await loadBookings();
    }
});
