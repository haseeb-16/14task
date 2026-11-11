
import {
    getPreferences,
    updatePreference,
    startSession,
    endSession
} from "./storage.js";

import {
    getElement,
    showStatus,
    showToast,
    renderProfile,
    renderApplication,
    renderStatistics,
    renderAssignments,
    renderNotifications,
    renderAssignmentDetails,
    observeSections,
    observeNotificationChanges
} from "./ui.js";

// ==============================
// APPLICATION STATE
// ==============================

const state = {
    profile: null,
    application: null,
    assignments: [],
    notifications: [],
    selectedTab: "overview",
    statusFilter: "all",
    searchTerm: "",
    sortBy: "due-date",
    theme: "light",
    draggedAssignmentId: null
};

let searchTimer = null;
let clockTimer = null;

// ==============================
// INITIALIZE STORAGE
// ==============================

const savedPreferences = getPreferences();

state.selectedTab = savedPreferences.selectedTab ?? "overview";
state.statusFilter = savedPreferences.statusFilter ?? "all";
state.sortBy = savedPreferences.sortBy ?? "due-date";
state.theme = savedPreferences.theme ?? "light";

startSession();

// Temporary session-only value.
const sessionWelcome = sessionStorage.getItem("internhub-welcome-shown");

if (!sessionWelcome) {

    showToast("Welcome to your InternHub dashboard!");

    sessionStorage.setItem("internhub-welcome-shown", "true");
}

// ==============================
// LOAD DASHBOARD DATA
// ==============================

async function loadDashboard() {

    showStatus("Loading dashboard data...");

    try {

        const response = await fetch("./data/dashboard.json", {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(
                `HTTP error: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        if (
            !data ||
            typeof data !== "object" ||
            !data.profile ||
            !data.application ||
            !Array.isArray(data.assignments) ||
            !Array.isArray(data.notifications)
        ) {
            throw new Error("Dashboard data has an invalid structure.");
        }

        state.profile = validateProfile(data.profile);
        state.application = validateApplication(data.application);
        state.assignments = validateAssignments(data.assignments);
        state.notifications = validateNotifications(data.notifications);

        renderDashboard();

        restorePreferences();

        showStatus("Dashboard loaded successfully.", "success");

    } catch (error) {

        console.error("Dashboard loading failed:", error);

        showStatus(
            `Unable to load dashboard: ${error.message}`,
            "error"
        );

        const container = getElement("#assignments-container");

        if (container) {
            container.textContent = "Unable to load assignments.";
        }
    }
}

// ==============================
// VALIDATE EXTERNAL DATA
// ==============================

function validateProfile(profile) {

    return {
        name: typeof profile.name === "string" ? profile.name : "Intern",
        email: typeof profile.email === "string" ? profile.email : "",
        program: typeof profile.program === "string" ? profile.program : "Training Program",
        startDate: typeof profile.startDate === "string" ? profile.startDate : "-",
        role: typeof profile.role === "string" ? profile.role : "Intern"
    };
}

function validateApplication(application) {

    return {
        position: typeof application.position === "string"
            ? application.position
            : "Internship",

        status: typeof application.status === "string"
            ? application.status
            : "Pending",

        appliedOn: typeof application.appliedOn === "string"
            ? application.appliedOn
            : "-",

        message: typeof application.message === "string"
            ? application.message
            : "No application information available."
    };
}

function validateAssignments(assignments) {

    return assignments.filter(item => {

        return (
            item !== null &&
            typeof item === "object" &&
            Number.isInteger(item.id) &&
            typeof item.title === "string" &&
            typeof item.description === "string" &&
            ["Pending", "In Progress", "Completed"].includes(item.status) &&
            typeof item.dueDate === "string" &&
            Number.isFinite(item.progress) &&
            item.progress >= 0 &&
            item.progress <= 100
        );
    });
}

function validateNotifications(notifications) {

    return notifications.filter(item => {

        return (
            item !== null &&
            typeof item === "object" &&
            Number.isInteger(item.id) &&
            typeof item.title === "string" &&
            typeof item.message === "string" &&
            typeof item.date === "string"
        );
    });
}

// ==============================
// RENDER DASHBOARD
// ==============================

function renderDashboard() {

    renderProfile(state.profile);

    renderApplication(state.application);

    renderStatistics(state.assignments);

    renderNotifications(state.notifications);

    applyAssignmentFilters();

    observeSections();
}

// ==============================
// PREFERENCES
// ==============================

function restorePreferences() {

    const searchInput = getElement("#assignment-search");
    const statusFilter = getElement("#status-filter");
    const sortFilter = getElement("#sort-filter");

    if (searchInput) {
        searchInput.value = state.searchTerm;
    }

    if (
        statusFilter &&
        [...statusFilter.options].some(
            option => option.value === state.statusFilter
        )
    ) {
        statusFilter.value = state.statusFilter;
    } else {
        state.statusFilter = "all";
    }

    if (
        sortFilter &&
        [...sortFilter.options].some(
            option => option.value === state.sortBy
        )
    ) {
        sortFilter.value = state.sortBy;
    } else {
        state.sortBy = "due-date";
    }

    applyTheme();

    applyAssignmentFilters();

    changeTab(state.selectedTab, false);
}

function saveDashboardPreferences() {

    updatePreference("selectedTab", state.selectedTab);
    updatePreference("statusFilter", state.statusFilter);
    updatePreference("sortBy", state.sortBy);
    updatePreference("theme", state.theme);
}

// ==============================
// THEME MANAGEMENT
// ==============================

function applyTheme() {

    document.body.classList.toggle(
        "dark-theme",
        state.theme === "dark"
    );

    const themeButton = getElement("#theme-button");

    if (themeButton) {
        themeButton.textContent =
            state.theme === "dark" ? "Light Mode" : "Dark Mode";
    }
}

const themeButton = getElement("#theme-button");

themeButton?.addEventListener("click", () => {

    state.theme = state.theme === "dark" ? "light" : "dark";

    applyTheme();

    saveDashboardPreferences();

    showToast(`${state.theme} theme enabled.`);
});

// ==============================
// ASSIGNMENT FILTERING
// ==============================

function applyAssignmentFilters() {

    const filtered = state.assignments.filter(assignment => {

        const matchesSearch =
            assignment.title.toLowerCase().includes(state.searchTerm) ||
            assignment.description.toLowerCase().includes(state.searchTerm);

        const matchesStatus =
            state.statusFilter === "all" ||
            assignment.status === state.statusFilter;

        return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {

        if (state.sortBy === "title") {
            return a.title.localeCompare(b.title);
        }

        if (state.sortBy === "progress") {
            return b.progress - a.progress;
        }

        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    renderAssignments(filtered);

    updateFilterURL();
}

// ==============================
// DEBOUNCE
// ==============================

function debounce(callback, delay = 300) {

    return (...args) => {

        clearTimeout(searchTimer);

        searchTimer = window.setTimeout(() => {
            callback(...args);
        }, delay);
    };
}

const searchInput = getElement("#assignment-search");

const handleSearch = debounce(event => {

    state.searchTerm = event.target.value.trim().toLowerCase();

    applyAssignmentFilters();

}, 300);

searchInput?.addEventListener("input", handleSearch);

// ==============================
// FILTER EVENTS
// ==============================

const statusFilter = getElement("#status-filter");

statusFilter?.addEventListener("change", event => {

    state.statusFilter = event.target.value;

    applyAssignmentFilters();

    saveDashboardPreferences();
});

const sortFilter = getElement("#sort-filter");

sortFilter?.addEventListener("change", event => {

    state.sortBy = event.target.value;

    applyAssignmentFilters();

    saveDashboardPreferences();
});

// ==============================
// URL AND URLSEARCHPARAMS
// ==============================

function updateFilterURL() {

    const url = new URL(window.location.href);

    if (state.statusFilter === "all") {
        url.searchParams.delete("status");
    } else {
        url.searchParams.set("status", state.statusFilter);
    }

    if (state.searchTerm) {
        url.searchParams.set("search", state.searchTerm);
    } else {
        url.searchParams.delete("search");
    }

    window.history.replaceState(
        { tab: state.selectedTab },
        "",
        url
    );
}

function restoreURLFilters() {

    const params = new URLSearchParams(window.location.search);

    const search = params.get("search") ?? "";
    const status = params.get("status") ?? "all";

    const validStatuses = [
        "all",
        "Pending",
        "In Progress",
        "Completed"
    ];

    state.searchTerm = search.toLowerCase();

    state.statusFilter = validStatuses.includes(status)
        ? status
        : "all";
}

// ==============================
// NAVIGATION AND HISTORY API
// ==============================

function changeTab(tab, addHistory = true) {

    const validTabs = [
        "overview",
        "assignments",
        "progress",
        "notifications",
        "application"
    ];

    if (!validTabs.includes(tab)) {
        tab = "overview";
    }

    state.selectedTab = tab;

    document.querySelectorAll("[data-section]").forEach(section => {

        section.hidden = section.id !== tab;
    });

    document.querySelectorAll(".nav-button").forEach(button => {

        const isActive = button.dataset.tab === tab;

        button.classList.toggle("active", isActive);

        button.setAttribute(
            "aria-current",
            isActive ? "page" : "false"
        );
    });

    if (addHistory) {

        const url = new URL(window.location.href);

        url.searchParams.set("tab", tab);

        window.history.pushState(
            { tab },
            "",
            url
        );
    }

    saveDashboardPreferences();
}

// Event delegation for navigation buttons.
const dashboardNav = getElement(".dashboard-nav");

dashboardNav?.addEventListener("click", event => {

    const button = event.target.closest("[data-tab]");

    if (!button || !dashboardNav.contains(button)) {
        return;
    }

    changeTab(button.dataset.tab);
});

// Browser back and forward navigation.
window.addEventListener("popstate", () => {

    const params = new URLSearchParams(window.location.search);

    const tab = params.get("tab") ?? "overview";

    restoreURLFilters();

    if (searchInput) {
        searchInput.value = state.searchTerm;
    }

    if (statusFilter) {
        statusFilter.value = state.statusFilter;
    }

    applyAssignmentFilters();

    changeTab(tab, false);

    saveDashboardPreferences();
});

// Restore URL filters before rendering.
restoreURLFilters();

// ==============================
// ASSIGNMENT MODAL
// ==============================

// Event delegation for dynamically created cards.
const assignmentsContainer = getElement("#assignments-container");

assignmentsContainer?.addEventListener("click", event => {

    const button = event.target.closest('[data-action="details"]');

    if (!button) return;

    const card = button.closest(".assignment-card");

    if (!card) return;

    const assignment = state.assignments.find(
        item => String(item.id) === card.dataset.id
    );

    if (assignment) {
        renderAssignmentDetails(assignment);
    }
});

const closeModalButton = getElement("#close-modal");
const assignmentModal = getElement("#assignment-modal");

closeModalButton?.addEventListener("click", () => {
    assignmentModal?.close();
});

assignmentModal?.addEventListener("click", event => {

    if (event.target === assignmentModal) {
        assignmentModal.close();
    }
});

// ==============================
// DRAG AND DROP
// ==============================

assignmentsContainer?.addEventListener("dragstart", event => {

    const card = event.target.closest(".assignment-card");

    if (!card) return;

    state.draggedAssignmentId = Number(card.dataset.id);

    card.classList.add("dragging");

    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
            "text/plain",
            String(state.draggedAssignmentId)
        );
    }
});

assignmentsContainer?.addEventListener("dragover", event => {

    if (event.target.closest(".assignment-card")) {
        event.preventDefault();
    }
});

assignmentsContainer?.addEventListener("drop", event => {

    event.preventDefault();

    const targetCard = event.target.closest(".assignment-card");

    if (!targetCard || state.draggedAssignmentId === null) {
        return;
    }

    const targetId = Number(targetCard.dataset.id);

    const fromIndex = state.assignments.findIndex(
        item => item.id === state.draggedAssignmentId
    );

    const toIndex = state.assignments.findIndex(
        item => item.id === targetId
    );

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return;
    }

    const [movedItem] = state.assignments.splice(fromIndex, 1);

    state.assignments.splice(toIndex, 0, movedItem);

    applyAssignmentFilters();

    showToast("Assignment order updated.");
});

assignmentsContainer?.addEventListener("dragend", event => {

    const card = event.target.closest(".assignment-card");

    card?.classList.remove("dragging");

    state.draggedAssignmentId = null;
});

// ==============================
// FORM DATA AND FILE API
// ==============================

const updateForm = getElement("#update-form");
const fileInput = getElement("#update-file");
const fileInformation = getElement("#file-information");

fileInput?.addEventListener("change", () => {

    const file = fileInput.files?.[0];

    if (!file) {

        if (fileInformation) {
            fileInformation.textContent = "No file selected.";
        }

        return;
    }

    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowedTypes.includes(file.type)) {

        fileInput.value = "";

        if (fileInformation) {
            fileInformation.textContent = "Please select a PDF or Word document.";
        }

        showToast("Unsupported file type.", "error");

        return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {

        fileInput.value = "";

        if (fileInformation) {
            fileInformation.textContent = "File must be smaller than 5 MB.";
        }

        showToast("File is too large. Maximum size is 5 MB.", "error");

        return;
    }

    if (fileInformation) {

        fileInformation.textContent =
            `File: ${file.name} | Size: ${(file.size / 1024).toFixed(2)} KB | Type: ${file.type}`;
    }
});

updateForm?.addEventListener("submit", event => {

    event.preventDefault();

    if (!updateForm.reportValidity()) {
        return;
    }

    const formData = new FormData(updateForm);

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const file = formData.get("document");

    if (!name || !email) {
        showToast("Please complete all required fields.", "error");
        return;
    }

    if (file instanceof File && file.size > 0) {

        console.log("Selected file metadata:", {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });
    }

    // Demonstration only: local JSON cannot be updated by FormData.
    state.profile.name = name;
    state.profile.email = email;

    renderProfile(state.profile);

    showToast("Information updated for this session.");

    console.log("Form values:", {
        name,
        email,
        fileName: file instanceof File && file.size > 0
            ? file.name
            : "No file selected"
    });

    updateForm.reset();

    if (fileInformation) {
        fileInformation.textContent = "No file selected.";
    }
});



const copyEmailButton = getElement("#copy-email-button");

copyEmailButton?.addEventListener("click", async () => {

    const email = state.profile?.email;

    if (!email) {
        showToast("Email address is not available.", "error");
        return;
    }

    if (!navigator.clipboard?.writeText) {
        showToast("Clipboard API is not available in this browser.", "error");
        return;
    }

    try {

        await navigator.clipboard.writeText(email);

        showToast("Email copied to clipboard.");

    } catch (error) {

        console.error("Clipboard error:", error);

        showToast("Unable to copy email.", "error");
    }
});


function checkBrowserCapabilities() {

    console.log("Browser capabilities:", {
        online: navigator.onLine,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        clipboardAvailable: Boolean(navigator.clipboard),
        geolocationAvailable: Boolean(navigator.geolocation),
        localStorageAvailable: typeof Storage !== "undefined",
        intersectionObserverAvailable: "IntersectionObserver" in window,
        mutationObserverAvailable: "MutationObserver" in window
    });
}

window.addEventListener("online", () => {
    showToast("Internet connection restored.");
});

window.addEventListener("offline", () => {
    showToast("You are currently offline.", "error");
});

// ==============================
// GEOLOCATION API
// ==============================

const locationButton = getElement("#location-button");

locationButton?.addEventListener("click", () => {

    if (!navigator.geolocation) {

        showToast("Geolocation is not supported by this browser.", "error");

        return;
    }

    if (!window.isSecureContext) {

        showToast("Geolocation requires HTTPS or localhost.", "error");

        return;
    }

    locationButton.disabled = true;

    showToast("Requesting location permission...");

    navigator.geolocation.getCurrentPosition(

        position => {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            console.log("Location coordinates:", {
                latitude,
                longitude
            });

            showToast("Location retrieved successfully.");

            locationButton.disabled = false;
        },

        error => {

            console.error("Geolocation error:", error.message);

            showToast(
                "Location unavailable. Check your browser permission.",
                "error"
            );

            locationButton.disabled = false;
        },

        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
        }
    );
});



const clearNotificationsButton = getElement("#clear-notifications");

clearNotificationsButton?.addEventListener("click", () => {

    state.notifications = [];

    renderNotifications(state.notifications);

    showToast("Notifications cleared.");
});



const notificationObserver = observeNotificationChanges(count => {

    console.log("Notification list updated. Items:", count);
});


function updateClock() {

    const clock = getElement("#clock");

    if (!clock) return;

    clock.textContent = new Date().toLocaleTimeString();
}

updateClock();

clockTimer = window.setInterval(updateClock, 1000);

// ==============================
// THROTTLE
// ==============================

function throttle(callback, delay = 200) {

    let lastCall = 0;

    return (...args) => {

        const now = Date.now();

        if (now - lastCall < delay) {
            return;
        }

        lastCall = now;

        callback(...args);
    };
}

const handleScroll = throttle(() => {

    console.log("Scroll position:", window.scrollY);

}, 500);

window.addEventListener("scroll", handleScroll, {
    passive: true
});



const homeLink = getElement("#home-link");

homeLink?.addEventListener("click", event => {

    event.preventDefault();

    changeTab("overview");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});


window.addEventListener("pagehide", () => {

    if (clockTimer !== null) {
        clearInterval(clockTimer);
    }

    clearTimeout(searchTimer);

    notificationObserver?.disconnect();

    endSession();
});


checkBrowserCapabilities();

loadDashboard();
