/**
 * Storage Manager for Word Association Challenge
 * Handles localStorage-based persistence with enhanced functionality
 * Fixed readonly property issues and improved error handling
 */

class StorageManager {
    constructor() {
        this.storagePrefix = 'wordchallenge_';
        this.storageAvailable = this.checkStorageSupport();

        // Initialize storage
        this.init();
    }

    /**
     * Initialize storage with default values
     */
    init() {
        try {
            if (!this.getData('initialized')) {
                this.resetProgress();
                this.setData('initialized', true);
            }
        } catch (error) {
            console.warn('Storage initialization failed:', error);
            // Continue without storage if it fails
        }
    }

    /**
     * Check if localStorage is available and working
     */
    checkStorageSupport() {
        try {
            const testKey = 'storage_test';
            const testValue = 'test';

            localStorage.setItem(testKey, testValue);
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);

            return retrieved === testValue;
        } catch (error) {
            console.warn('localStorage not available:', error);
            return false;
        }
    }

    /**
     * Set data to localStorage
     * @param {string} key - Storage key (without prefix)
     * @param {any} value - Value to store
     */
    setData(key, value) {
        if (!this.storageAvailable) {
            console.warn('Storage not available, cannot save:', key);
            return false;
        }

        try {
            const fullKey = `${this.storagePrefix}${key}`;
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(fullKey, serializedValue);
            return true;
        } catch (error) {
            console.error('Failed to save data:', error);
            return false;
        }
    }

    /**
     * Get data from localStorage
     * @param {string} key - Storage key (without prefix)
     * @param {any} defaultValue - Default value if not found
     * @returns {any} Stored value or default
     */
    getData(key, defaultValue = null) {
        if (!this.storageAvailable) {
            return defaultValue;
        }

        try {
            const fullKey = `${this.storagePrefix}${key}`;
            const item = localStorage.getItem(fullKey);

            if (item === null) {
                return defaultValue;
            }

            return JSON.parse(item);
        } catch (error) {
            console.warn('Failed to retrieve data for key:', key, error);
            return defaultValue;
        }
    }

    /**
     * Get game statistics
     */
    getStats() {
        return {
            totalScore: this.getData('totalScore', 0),
            currentStreak: this.getData('currentStreak', 0),
            bestStreak: this.getData('bestStreak', 0),
            level: this.getData('level', 1),
            totalWords: this.getData('totalWords', 0),
            correctAnswers: this.getData('correctAnswers', 0),
            averageAccuracy: this.getAverageAccuracy()
        };
    }

    /**
     * Update game statistics
     * @param {Object} updates - Statistics to update
     */
    updateStats(updates) {
        const current = this.getStats();

        if (typeof updates.scoreIncrease === 'number') {
            this.setData('totalScore', current.totalScore + updates.scoreIncrease);
        }

        if (typeof updates.streak === 'number') {
            this.setData('currentStreak', updates.streak);
            if (updates.streak > current.bestStreak) {
                this.setData('bestStreak', updates.streak);
            }
        }

        if (typeof updates.level === 'number') {
            this.setData('level', updates.level);
        }

        if (updates.wordCompleted === true) {
            this.setData('totalWords', current.totalWords + 1);
        }

        if (typeof updates.correctAnswer === 'boolean') {
            if (updates.correctAnswer) {
                this.setData('correctAnswers', current.correctAnswers + 1);
            }
        }
    }

    /**
     * Get user preferences
     */
    getPreferences() {
        return {
            difficulty: this.getData('difficulty', 'easy'),
            category: this.getData('category', 'general')
        };
    }

    /**
     * Update user preferences
     * @param {Object} preferences - Preferences to update
     */
    updatePreferences(preferences) {
        Object.entries(preferences).forEach(([key, value]) => {
            this.setData(key, value);
        });
    }

    /**
     * Get completed words array
     * @returns {Array} Array of completed word strings
     */
    getCompletedWords() {
        return this.getData('completedWords', []);
    }

    /**
     * Add word to completed list
     * @param {string} word - Word that was completed
     */
    addCompletedWord(word) {
        const completed = this.getCompletedWords();
        if (!completed.includes(word)) {
            completed.push(word);
            this.setData('completedWords', completed);
        }
    }

    /**
     * Get missed words with frequency tracking
     * @returns {Object} Object with word as key and miss count as value
     */
    getMissedWords() {
        return this.getData('missedWords', {});
    }

    /**
     * Add word to missed list or increment miss count
     * @param {string} word - Word that was missed
     */
    addMissedWord(word) {
        const missed = this.getMissedWords();
        missed[word] = (missed[word] || 0) + 1;
        this.setData('missedWords', missed);
    }

    /**
     * Remove word from missed list (when answered correctly)
     * @param {string} word - Word to remove from missed list
     */
    removeMissedWord(word) {
        const missed = this.getMissedWords();
        if (missed[word]) {
            delete missed[word];
            this.setData('missedWords', missed);
        }
    }

    /**
     * Get word accuracy tracking
     * @returns {Object} Object with word as key and {correct, total} as value
     */
    getWordAccuracy() {
        return this.getData('wordAccuracy', {});
    }

    /**
     * Update word accuracy
     * @param {string} word - Word to update
     * @param {boolean} correct - Whether answer was correct
     */
    updateWordAccuracy(word, correct) {
        const accuracy = this.getWordAccuracy();
        if (!accuracy[word]) {
            accuracy[word] = { correct: 0, total: 0 };
        }

        accuracy[word].total++;
        if (correct) {
            accuracy[word].correct++;
        }

        this.setData('wordAccuracy', accuracy);
    }

    /**
     * Get difficulty-specific statistics
     * @returns {Object} Object with difficulty as key and stats as value
     */
    getDifficultyStats() {
        return this.getData('difficultyStats', {});
    }

    /**
     * Update difficulty-specific accuracy
     * @param {string} difficulty - Difficulty level (easy, medium, hard)
     * @param {boolean} correct - Whether answer was correct
     */
    updateDifficultyAccuracy(difficulty, correct) {
        const difficultyStats = this.getDifficultyStats();

        if (!difficultyStats[difficulty]) {
            difficultyStats[difficulty] = { correct: 0, total: 0, accuracy: 0 };
        }

        difficultyStats[difficulty].total++;
        if (correct) {
            difficultyStats[difficulty].correct++;
        }

        // Calculate accuracy percentage
        const stats = difficultyStats[difficulty];
        stats.accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

        this.setData('difficultyStats', difficultyStats);
    }

    /**
     * Calculate average accuracy percentage
     * @returns {number} Accuracy percentage (0-100)
     */
    getAverageAccuracy() {
        const totalWords = this.getData('totalWords', 0);
        const correctAnswers = this.getData('correctAnswers', 0);

        if (totalWords === 0) return 0;
        return Math.round((correctAnswers / totalWords) * 100);
    }

    /**
     * Get words that should appear more frequently (missed words with weights)
     * @returns {Object} Object with word as key and weight as value
     */
    getWordWeights() {
        const missed = this.getMissedWords();
        const weights = {};

        // Give missed words higher weight based on miss count
        Object.entries(missed).forEach(([word, missCount]) => {
            weights[word] = Math.min(missCount + 1, 5); // Cap at 5x weight
        });

        return weights;
    }

    /**
     * Reset all progress
     */
    resetProgress() {
        const defaultData = {
            totalScore: 0,
            currentStreak: 0,
            bestStreak: 0,
            level: 1,
            totalWords: 0,
            correctAnswers: 0,
            completedWords: [],
            missedWords: {},
            wordAccuracy: {},
            difficultyStats: {},
            difficulty: 'easy',
            category: 'general',
            initialized: true
        };

        Object.entries(defaultData).forEach(([key, value]) => {
            this.setData(key, value);
        });
    }

    /**
     * Export progress data for backup
     * @returns {Object} All progress data
     */
    exportData() {
        const data = {};

        if (!this.storageAvailable) {
            return data;
        }

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    const shortKey = key.substring(this.storagePrefix.length);
                    const value = localStorage.getItem(key);
                    try {
                        data[shortKey] = JSON.parse(value);
                    } catch (e) {
                        data[shortKey] = value;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to export data:', error);
        }

        return data;
    }

    /**
     * Import progress data
     * @param {Object} data - Data to import
     * @returns {boolean} Success status
     */
    importData(data) {
        if (!this.storageAvailable || !data || typeof data !== 'object') {
            return false;
        }

        try {
            Object.entries(data).forEach(([key, value]) => {
                this.setData(key, value);
            });
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    /**
     * Clear all stored data
     */
    clearAll() {
        if (!this.storageAvailable) {
            return false;
        }

        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    keysToRemove.push(key);
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });

            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageInfo() {
        if (!this.storageAvailable) {
            return { available: false };
        }

        try {
            let totalSize = 0;
            let itemCount = 0;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    const value = localStorage.getItem(key);
                    totalSize += (key + value).length * 2; // Rough byte estimate
                    itemCount++;
                }
            }

            return {
                available: true,
                itemCount,
                totalSize,
                totalSizeFormatted: this.formatBytes(totalSize)
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return { available: true, error: true };
        }
    }

    /**
     * Format bytes for display
     * @param {number} bytes - Number of bytes
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get privacy notice for storage usage
     * @returns {string} Privacy notice text
     */
    getPrivacyNotice() {
        return `This game stores your progress locally on your device using localStorage. ` +
            `This includes completed words, statistics, and preferences. ` +
            `No data is sent to external servers. You can reset your progress anytime.`;
    }

    /**
     * Get completed categories for a specific difficulty
     * @param {string} difficulty - Difficulty level
     * @returns {Array} Array of completed category names
     */
    getCompletedCategories(difficulty) {
        const completedKey = `completedCategories_${difficulty}`;
        return this.getData(completedKey, []);
    }

    /**
     * Mark a category as completed for a specific difficulty
     * @param {string} difficulty - Difficulty level
     * @param {string} category - Category name
     */
    markCategoryCompleted(difficulty, category) {
        const completedKey = `completedCategories_${difficulty}`;
        const completed = this.getCompletedCategories(difficulty);

        if (!completed.includes(category)) {
            completed.push(category);
            this.setData(completedKey, completed);

            // Also track completion timestamp
            const timestampKey = `categoryCompleted_${difficulty}_${category}`;
            this.setData(timestampKey, new Date().toISOString());

            console.log(`Marked ${difficulty}/${category} as completed`);
        }
    }

    /**
     * Check if a category is completed for a specific difficulty
     * @param {string} difficulty - Difficulty level
     * @param {string} category - Category name
     * @returns {boolean} True if completed
     */
    isCategoryCompleted(difficulty, category) {
        const completed = this.getCompletedCategories(difficulty);
        return completed.includes(category);
    }

    /**
     * Get category completion statistics across all difficulties
     * @returns {Object} Completion stats
     */
    getCategoryCompletionStats() {
        const difficulties = ['easy', 'medium', 'hard'];
        const categories = ['general', 'academic', 'business'];
        const stats = {
            totalCategories: difficulties.length * categories.length,
            completedCategories: 0,
            byDifficulty: {},
            completionPercentage: 0
        };

        difficulties.forEach(difficulty => {
            const completed = this.getCompletedCategories(difficulty);
            stats.byDifficulty[difficulty] = {
                total: categories.length,
                completed: completed.length,
                categories: completed,
                percentage: Math.round((completed.length / categories.length) * 100)
            };
            stats.completedCategories += completed.length;
        });

        stats.completionPercentage = Math.round((stats.completedCategories / stats.totalCategories) * 100);
        return stats;
    }

    /**
     * Get completion date for a specific category/difficulty
     * @param {string} difficulty - Difficulty level  
     * @param {string} category - Category name
     * @returns {string|null} ISO date string or null if not completed
     */
    getCategoryCompletionDate(difficulty, category) {
        const timestampKey = `categoryCompleted_${difficulty}_${category}`;
        return this.getData(timestampKey, null);
    }

    /**
     * Reset category completion tracking
     * @param {string} difficulty - Optional: specific difficulty to reset
     */
    resetCategoryCompletion(difficulty = null) {
        if (difficulty) {
            // Reset specific difficulty
            const completedKey = `completedCategories_${difficulty}`;
            this.setData(completedKey, []);

            // Also remove completion timestamps for this difficulty
            const categories = ['general', 'academic', 'business'];
            categories.forEach(category => {
                const timestampKey = `categoryCompleted_${difficulty}_${category}`;
                this.setData(timestampKey, null);
            });
        } else {
            // Reset all difficulties
            const difficulties = ['easy', 'medium', 'hard'];
            difficulties.forEach(diff => {
                this.resetCategoryCompletion(diff);
            });
        }
    }
}