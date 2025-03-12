/**
 * Cookie management utility
 * Handles setting, getting, and checking cookies with expiration support
 */
const CookieManager = {
    /**
     * Set a cookie with a specific name, value, and expiration days
     * @param {string} name - The name of the cookie
     * @param {string} value - The value to store in the cookie
     * @param {number} days - Number of days until cookie expiration
     */
    setCookie: function(name, value, days = 31) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    },

    /**
     * Get a cookie value by name
     * @param {string} name - The name of the cookie to retrieve
     * @returns {string|null} - The cookie value or null if not found
     */
    getCookie: function(name) {
        const cookieName = name + "=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const cookieArray = decodedCookie.split(';');
        
        for (let i = 0; i < cookieArray.length; i++) {
            let cookie = cookieArray[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1);
            }
            if (cookie.indexOf(cookieName) === 0) {
                return cookie.substring(cookieName.length, cookie.length);
            }
        }
        return null;
    },

    /**
     * Check if a cookie exists
     * @param {string} name - The name of the cookie to check
     * @returns {boolean} - True if cookie exists, false otherwise
     */
    checkCookie: function(name) {
        const cookie = this.getCookie(name);
        return cookie !== null && cookie !== "";
    }
};