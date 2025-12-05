/**
 * In-memory storage for pending alerts before they are saved to database
 * This stores temporary alert configurations while users are setting them up
 */

const pendingAlerts = new Map();

/**
 * Store a pending alert configuration
 * @param {string} key - Unique key (userId or chatId)
 * @param {Object} alertData - Alert configuration data
 * @param {string} alertData.token - Token address
 * @param {string} alertData.direction - Alert direction ('up' or 'down')
 * @param {number} alertData.threshold - Threshold percentage
 * @param {number} [alertData.forGroup] - Group chat ID if configuring for a group
 */
const setPendingAlert = (key, alertData) => {
    pendingAlerts.set(key, alertData);
};

/**
 * Retrieve a pending alert configuration
 * @param {string} key - Unique key (userId or chatId)
 * @returns {Object|undefined} Alert configuration or undefined
 */
const getPendingAlert = (key) => {
    return pendingAlerts.get(key);
};

/**
 * Delete a pending alert configuration
 * @param {string} key - Unique key (userId or chatId)
 */
const deletePendingAlert = (key) => {
    pendingAlerts.delete(key);
};

/**
 * Check if a pending alert exists
 * @param {string} key - Unique key (userId or chatId)
 * @returns {boolean}
 */
const hasPendingAlert = (key) => {
    return pendingAlerts.has(key);
};

module.exports = {
    setPendingAlert,
    getPendingAlert,
    deletePendingAlert,
    hasPendingAlert
};
