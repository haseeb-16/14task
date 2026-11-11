
/**
 * Safely find an HTML element.
 */
export function getElement(selector) {

    const element = document.querySelector(selector);

    if (!element) {
        console.warn(`HTML element not found: ${selector}`);
    }

    return element;
}

/**
 * Display a status message.
 */
export function showStatus(message, type = "info") {

    const element = getElement("#status-message");

    if (!element) return;

    element.textContent = message;
    element.className = "status-message";

    if (type === "success") {
        element.classList.add("success");
    }

    if (type === "error") {
        element.classList.add("error");
    }
}

/**
 * Display toast notifications.
 */
export function showToast(message, type = "success") {

    const container = getElement("#toast-container");

    if (!container) return;

    const toast = document.createElement("div");

    toast.className = type === "error" ? "toast error" : "toast";
    toast.textContent = message;

    container.append(toast);

    window.setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * Render profile information.
 */
export function renderProfile(profile) {

    const fields = {
        "#profile-name": profile.name,
        "#profile-full-name": profile.name,
        "#profile-email": profile.email,
        "#profile-program": profile.program,
        "#profile-start-date": profile.startDate,
        "#profile-role": profile.role,
        "#update-name": profile.name,
        "#update-email": profile.email
    };

    Object.entries(fields).forEach(([selector, value]) => {

        const element = getElement(selector);

        if (element) {
            element.textContent = value ?? "-";

            if (element.matches("input")) {
                element.value = value ?? "";
            }
        }
    });
}

/**
 * Render application information.
 */
export function renderApplication(application) {

    const fields = {
        "#application-position": application.position,
        "#application-status": application.status,
        "#application-date": application.appliedOn,
        "#application-message": application.message,
        "#overview-application-status": application.status,
        "#overview-application-message": application.message
    };

    Object.entries(fields).forEach(([selector, value]) => {

        const element = getElement(selector);

        if (element) {
            element.textContent = value ?? "-";
        }
    });
}

/**
 * Render dashboard statistics.
 */
export function renderStatistics(assignments) {

    const total = assignments.length;

    const completed = assignments.filter(
        item => item.status === "Completed"
    ).length;

    const active = assignments.filter(
        item => item.status === "In Progress"
    ).length;

    const progress = total === 0
        ? 0
        : Math.round(
            assignments.reduce(
                (sum, item) => sum + item.progress,
                0
            ) / total
        );

    const values = {
        "#total-assignments": total,
        "#completed-assignments": completed,
        "#active-assignments": active,
        "#overall-progress": `${progress}%`,
        "#progress-percentage": `${progress}%`
    };

    Object.entries(values).forEach(([selector, value]) => {

        const element = getElement(selector);

        if (element) {
            element.textContent = value;
        }
    });

    const progressFill = getElement("#progress-fill");
    const progressBar = getElement("#overall-progress-bar");
    const description = getElement("#progress-description");

    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    if (progressBar) {
        progressBar.setAttribute("aria-valuenow", String(progress));
    }

    if (description) {
        description.textContent =
            `${completed} of ${total} assignments completed.`;
    }
}

/**
 * Render assignment cards.
 */
export function renderAssignments(assignments) {

    const container = getElement("#assignments-container");

    if (!container) return;

    container.replaceChildren();

    if (assignments.length === 0) {

        const emptyMessage = document.createElement("p");

        emptyMessage.className = "empty-state";
        emptyMessage.textContent = "No assignments match your filters.";

        container.append(emptyMessage);

        return;
    }

    assignments.forEach(assignment => {

        const card = document.createElement("article");

        card.className = "assignment-card";
        card.dataset.id = String(assignment.id);
        card.draggable = true;

        const badge = document.createElement("span");

        badge.className =
            `status-badge ${assignment.status.toLowerCase().replaceAll(" ", "-")}`;

        badge.textContent = assignment.status;

        const title = document.createElement("h3");
        title.textContent = assignment.title;

        const description = document.createElement("p");
        description.textContent = assignment.description;

        const dueDate = document.createElement("p");
        dueDate.textContent = `Due date: ${assignment.dueDate}`;

        const progressText = document.createElement("p");
        progressText.textContent = `Progress: ${assignment.progress}%`;

        const progressTrack = document.createElement("div");
        progressTrack.className = "card-progress";

        const progressFill = document.createElement("div");
        progressFill.className = "card-progress-fill";
        progressFill.style.width = `${assignment.progress}%`;

        progressTrack.append(progressFill);

        const detailsButton = document.createElement("button");

        detailsButton.type = "button";
        detailsButton.dataset.action = "details";
        detailsButton.textContent = "View Details";

        card.append(
            badge,
            title,
            description,
            dueDate,
            progressText,
            progressTrack,
            detailsButton
        );

        container.append(card);
    });
}

/**
 * Render notifications.
 */
export function renderNotifications(notifications) {

    const container = getElement("#notifications-container");

    if (!container) return;

    container.replaceChildren();

    if (notifications.length === 0) {

        const emptyMessage = document.createElement("p");

        emptyMessage.className = "empty-state";
        emptyMessage.textContent = "No notifications available.";

        container.append(emptyMessage);

        return;
    }

    notifications.forEach(notification => {

        const item = document.createElement("article");
        item.className = "notification-item";

        const title = document.createElement("strong");
        title.textContent = notification.title;

        const message = document.createElement("p");
        message.textContent = notification.message;

        const date = document.createElement("p");
        date.textContent = `Date: ${notification.date}`;

        item.append(title, message, date);

        container.append(item);
    });
}

/**
 * Display assignment details in the modal.
 */
export function renderAssignmentDetails(assignment) {

    const modal = getElement("#assignment-modal");
    const title = getElement("#modal-title");
    const content = getElement("#modal-content");

    if (!modal || !title || !content) return;

    title.textContent = assignment.title;
    content.replaceChildren();

    const details = [
        ["Description", assignment.description],
        ["Status", assignment.status],
        ["Due Date", assignment.dueDate],
        ["Progress", `${assignment.progress}%`]
    ];

    details.forEach(([label, value]) => {

        const paragraph = document.createElement("p");

        const strong = document.createElement("strong");
        strong.textContent = `${label}: `;

        paragraph.append(strong, document.createTextNode(value));

        content.append(paragraph);
    });

    if (!modal.open) {
        modal.showModal();
    }
}

/**
 * Observe sections as they become visible.
 */
export function observeSections() {

    const sections = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {

        sections.forEach(section => {
            section.classList.add("visible");
        });

        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {

        entries.forEach(entry => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

                currentObserver.unobserve(entry.target);
            }
        });

    }, {
        threshold: 0.1
    });

    sections.forEach(section => {
        observer.observe(section);
    });
}

/**
 * Observe notification DOM changes.
 */
export function observeNotificationChanges(callback) {

    const container = getElement("#notifications-container");

    if (!container || !("MutationObserver" in window)) return null;

    const observer = new MutationObserver(() => {
        callback(container.children.length);
    });

    observer.observe(container, {
        childList: true
    });

    return observer;
}
