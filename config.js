// G2 Releases Database Configuration
const CONFIG = {
  VERSION: '2.0.9',
  APP_NAME: 'G2 Releases Database',
  CACHE: {
    EXPIRATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    KEYS: {
      YOYOS: 'yoyos_cache',
      SPECS: 'specs_cache'
    }
  },
  API: {
    YOYOS_URL: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=yoyos',
    SPECS_URL: 'https://script.google.com/macros/s/AKfycby-6xXDgtZIaMa0-SV5kmNwDIh5IbCyvCH8bjgs22eUVu4HbtX6RiOYItejI5fMzJywzQ/exec?sheet=specs'
  },
  ASSETS: {
    PLACEHOLDER_IMAGE: 'assets/placeholder.png'
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof self !== 'undefined') {
  // Service worker context
  self.APP_CONFIG = CONFIG;
} else {
  // Main thread context
  window.APP_CONFIG = CONFIG;
} 