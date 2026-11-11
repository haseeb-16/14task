
const STORAGE_KEY = "internhub-preferences";
const SESSION_KEY = "internhub-session";

/**
 * Read saved preferences from localStorage.
 */
export function getPreferences() {

    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return {};
        }

        const parsedData = JSON.parse(savedData);

        if (
            parsedData === null ||
            typeof parsedData !== "object" ||
            Array.isArray(parsedData)
        ) {
            return {};
        }

        return parsedData;

    } catch (error) {
        console.error("Unable to read preferences:", error);
        return {};
    }
}

/**
 * Save preferences to localStorage.
 */
export function savePreferences(preferences) {

    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(preferences)
        );

        return true;

    } catch (error) {
        console.error("Unable to save preferences:", error);
        return false;
    }
}

/**
 * Update one preference without removing others.
 */
export function updatePreference(key, value) {

    const preferences = getPreferences();

    preferences[key] = value;

    return savePreferences(preferences);
}

/**
 * Remove saved preferences.
 */
export function clearPreferences() {

    try {
        localStorage.removeItem(STORAGE_KEY);
        return true;

    } catch (error) {
        console.error("Unable to clear preferences:", error);
        return false;
    }
}

/**
 * Save temporary session information.
 */
export function startSession() {

    try {
        const existingSession = sessionStorage.getItem(SESSION_KEY);

        if (!existingSession) {
            sessionStorage.setItem(
                SESSION_KEY,
                JSON.stringify({
                    startedAt: new Date().toISOString()
                })
            );
        }

        return sessionStorage.getItem(SESSION_KEY);

    } catch (error) {
        console.error("Unable to access session storage:", error);
        return null;
    }
}

/**
 * Clear temporary session information.
 */
export function endSession() {

    try {
        sessionStorage.removeItem(SESSION_KEY);

    } catch (error) {
        console.error("Unable to clear session storage:", error);
    }
}
