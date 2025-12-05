/**
 * Message text builders for the notify command
 * All message text construction is centralized here
 */

/**
 * Build message text for alert configuration
 * @param {string} token - Token address or display name
 * @param {string} direction - Alert direction
 * @param {number} threshold - Threshold percentage
 * @returns {string} Formatted message text
 */
const buildAlertConfigMessage = (token, direction, threshold = 10) => {
    return `Token: ${token}\nDirection: ${direction.toUpperCase()}\nThreshold: ${threshold}%\n\nSelect direction and click Save:`;
};

/**
 * Build message text for group alert configuration (sent to DM)
 * @param {string} groupTitle - Group chat title
 * @param {string} tokenDisplay - Token display name
 * @param {string} direction - Alert direction
 * @param {number} threshold - Threshold percentage
 * @returns {string} Formatted message text
 */
const buildGroupAlertConfigMessage = (groupTitle, tokenDisplay, direction, threshold = 10) => {
    return `Configuring alert for group: ${groupTitle}\nToken: ${tokenDisplay}\nDirection: ${direction.toUpperCase()}\nThreshold: ${threshold}%\n\nSelect direction and save:`;
};

/**
 * Build message text for alert view/edit
 * @param {string} tokenDisplay - Token display name
 * @param {string} tokenAddress - Token address
 * @param {string} direction - Alert direction
 * @param {number} threshold - Threshold percentage
 * @returns {string} Formatted message text
 */
const buildAlertViewMessage = (tokenDisplay, tokenAddress, direction, threshold) => {
    return `Token: ${tokenDisplay}\nAddress: ${tokenAddress}\nDirection: ${direction.toUpperCase()}\nThreshold: ${threshold}%\n\nEdit direction or delete:`;
};

/**
 * Build success message for created alert
 * @param {string} token - Token address
 * @param {string} direction - Alert direction
 * @param {number} threshold - Threshold percentage
 * @returns {string} Formatted success message
 */
const buildAlertCreatedMessage = (token, direction, threshold = 10) => {
    return `✅ Alert created!\n\nToken: ${token}\nDirection: ${direction.toUpperCase()}\nThreshold: ${threshold}%`;
};

/**
 * Build message for group notification
 * @param {string} tokenDisplay - Token display name
 * @param {string} username - User's username or first name
 * @returns {string} Formatted message text
 */
const buildGroupNotificationMessage = (tokenDisplay, username) => {
    return `Configuring alert for ${tokenDisplay}\n\n@${username}, check your private messages.`;
};

/**
 * Build message for when user needs to start DM with bot
 * @param {string} username - User's username or first name
 * @param {string} botUsername - Bot's username
 * @returns {string} Formatted message text
 */
const buildStartDMMessage = (username, botUsername) => {
    return `@${username}, please start a private chat with me first by clicking: @${botUsername}`;
};

module.exports = {
    buildAlertConfigMessage,
    buildGroupAlertConfigMessage,
    buildAlertViewMessage,
    buildAlertCreatedMessage,
    buildGroupNotificationMessage,
    buildStartDMMessage
};
