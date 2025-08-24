/**
 * Word Manager for Word Association Challenge
 * Handles loading words from JSON files and smart selection logic
 */

class WordManager {
    constructor(storageManager) {
        this.storage = storageManager;
        this.words = {};
        this.availableDifficulties = ['easy', 'medium', 'hard'];
        this.availableCategories = ['general', 'academic', 'business'];
        this.currentWordList = [];
        this.usedWords = new Set(); // (no longer used for cycling, kept for backwards compat)

        // NEW: per (difficulty, category) cycle state
        // cacheKey -> { queue: number[], visited: Set<string> }
        this.cycleState = {};
    }

    // Initialize (or reinitialize) the cycle queue for a cacheKey
    initCycle(cacheKey, words, reshuffle = true) {
        const indices = words.map((_, i) => i);
        const order = reshuffle ? this.shuffleArray(indices) : indices;
        this.cycleState[cacheKey] = { queue: order, visited: new Set() };

        // Optional: persist if your storage supports it
        if (this.storage?.setCycleState) {
            this.storage.setCycleState(cacheKey, this.cycleState[cacheKey]);
        }
    }

    // Public helper if you want to replay a category/level later
    resetCycle(difficulty = 'easy', category = 'general', reshuffle = true) {
        const cacheKey = `${difficulty}_${category}`;
        const words = this.words[cacheKey] || [];
        this.initCycle(cacheKey, words, reshuffle);
    }


    /**
     * Load words for specific difficulty and category
     * @param {string} difficulty - Difficulty level
     * @param {string} category - Word category
     * @returns {Promise<boolean>} Success status
     */
    async loadWords(difficulty = 'easy', category = 'general') {
        const cacheKey = `${difficulty}_${category}`;

        // Return cached data if available
        if (this.words[cacheKey]) {
            return true;
        }

        try {
            const response = await fetch(`./data/${difficulty}/${category}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load ${difficulty}/${category} words: ${response.status}`);
            }

            const data = await response.json();

            // Validate data structure
            if (!this.validateWordData(data)) {
                throw new Error(`Invalid word data structure for ${difficulty}/${category}`);
            }

            this.words[cacheKey] = data.words;
            console.log(`Loaded ${data.words.length} words for ${difficulty}/${category}`);
            return true;

        } catch (error) {
            console.error('Error loading words:', error);
            // Fallback to sample data for testing
            this.words[cacheKey] = this.getSampleWords(difficulty, category);
            return false;
        }
    }

    /**
     * Validate word data structure
     * @param {Object} data - Word data from JSON
     * @returns {boolean} Valid structure
     */
    validateWordData(data) {
        if (!data || !Array.isArray(data.words)) {
            return false;
        }

        return data.words.every(word =>
            word.word &&
            word.pronunciation &&
            word.correct_definition &&
            Array.isArray(word.incorrect_options) &&
            word.incorrect_options.length >= 3
        );
    }

    /**
     * Get sample words for testing/fallback
     * @param {string} difficulty - Difficulty level
     * @param {string} category - Word category
     * @returns {Array} Sample words
     */
    getSampleWords(difficulty, category) {
        const sampleWords = {
            easy_general: [
                {
                    word: "Happy",
                    pronunciation: "/ˈhæp.i/",
                    correct_definition: "Feeling joy or pleasure",
                    incorrect_options: [
                        "Feeling tired and sleepy",
                        "Feeling angry or upset",
                        "Feeling confused or lost"
                    ]
                },
                {
                    word: "Brave",
                    pronunciation: "/breɪv/",
                    correct_definition: "Showing courage in dangerous situations",
                    incorrect_options: [
                        "Being very tall and strong",
                        "Moving slowly and carefully",
                        "Eating food very quickly"
                    ]
                }
            ],
            medium_general: [
                {
                    word: "Serendipity",
                    pronunciation: "/ˌser·ən·dɪp·ɪ·ti/",
                    correct_definition: "A pleasant surprise; finding something good unexpectedly",
                    incorrect_options: [
                        "A feeling of deep sadness or melancholy",
                        "The ability to speak multiple languages fluently",
                        "A state of complete chaos or disorder"
                    ]
                }
            ],
            hard_general: [
                {
                    word: "Ubiquitous",
                    pronunciation: "/juːˈbɪk.wɪ.təs/",
                    correct_definition: "Present everywhere at the same time",
                    incorrect_options: [
                        "Extremely rare and valuable",
                        "Moving in circular motions",
                        "Related to ancient history"
                    ]
                }
            ]
        };

        const key = `${difficulty}_${category}`;
        return sampleWords[key] || sampleWords['easy_general'];
    }

    /**
 * Get next word based on smart selection logic
 * @param {string} difficulty - Current difficulty
 * @param {string} category - Current category
 * @returns {Promise<Object|null>} Next word object or null
 */
    /**
     * Get next word with no repeats until all words are visited.
     * Returns { endOfCategory: true, message, total, visitedCount } when finished.
     */
    async getNextWord(difficulty = 'easy', category = 'general') {
        const cacheKey = `${difficulty}_${category}`;

        try {
            // Ensure words are loaded
            if (!this.words[cacheKey]) {
                const loaded = await this.loadWords(difficulty, category);
                if (!loaded) return null;
            }

            const words = this.words[cacheKey];
            if (!Array.isArray(words) || words.length === 0) return null;

            // Restore persisted cycle (optional) or init if missing
            if (!this.cycleState[cacheKey]) {
                // Try to restore
                if (this.storage?.getCycleState) {
                    const saved = this.storage.getCycleState(cacheKey);
                    if (saved && Array.isArray(saved.queue)) {
                        this.cycleState[cacheKey] = {
                            queue: [...saved.queue],
                            visited: new Set(saved.visited || [])
                        };
                    }
                }
                if (!this.cycleState[cacheKey]) {
                    this.initCycle(cacheKey, words, true);
                }
            }

            const state = this.cycleState[cacheKey];

            // If queue empty, we finished this category/level
            if (state.queue.length === 0) {
                return {
                    endOfCategory: true,
                    message: `All ${words.length} words completed for ${difficulty}/${category}.`,
                    total: words.length,
                    visitedCount: state.visited.size
                };
            }

            // Pop next index from the queue and mark visited
            const nextIdx = state.queue.shift();
            const selectedWord = words[nextIdx];
            state.visited.add(selectedWord.word);

            // Optional: persist after every pop if storage supports it
            if (this.storage?.setCycleState) {
                this.storage.setCycleState(cacheKey, {
                    queue: state.queue,
                    visited: Array.from(state.visited)
                });
            }

            const prepared = this.prepareWordForGame(selectedWord);

            // Add some lightweight metadata (handy for UI)
            const remaining = state.queue.length;
            return {
                ...prepared,
                meta: {
                    difficulty,
                    category,
                    remaining,
                    total: words.length,
                    isLastWord: remaining === 0
                }
            };

        } catch (error) {
            console.error('Error getting next word:', error);
            return null;
        }
    }

    /**
     * Prepare word object for game display
     * @param {Object} wordObj - Raw word object
     * @returns {Object} Game-ready word object
     */
    prepareWordForGame(wordObj) {
        // Shuffle options to randomize correct answer position
        const allOptions = [
            wordObj.correct_definition,
            ...wordObj.incorrect_options
        ];

        const shuffledOptions = this.shuffleArray([...allOptions]);

        return {
            word: wordObj.word,
            pronunciation: wordObj.pronunciation,
            options: shuffledOptions,
            correctAnswer: wordObj.correct_definition
        };
    }

    /**
     * Shuffle array using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    /**
     * Get available difficulties
     * @returns {Array} Array of difficulty strings
     */
    getDifficulties() {
        return this.availableDifficulties;
    }

    /**
     * Get available categories
     * @returns {Array} Array of category strings
     */
    getCategories() {
        return this.availableCategories;
    }

    /**
     * Get progress for current difficulty/category
     * @param {string} difficulty - Difficulty level
     * @param {string} category - Category
     * @returns {Promise<Object>} Progress information
     */
    async getProgress(difficulty = 'easy', category = 'general') {
        const cacheKey = `${difficulty}_${category}`;

        if (!this.words[cacheKey]) {
            await this.loadWords(difficulty, category);
        }

        const words = this.words[cacheKey];
        const completedWords = this.storage.getCompletedWords();
        const wordAccuracy = this.storage.getWordAccuracy();

        const totalWords = words.length;
        const completed = completedWords.filter(word =>
            words.some(w => w.word === word)
        ).length;

        const accuracy = this.calculateCategoryAccuracy(words, wordAccuracy);

        return {
            totalWords,
            completedWords: completed,
            remainingWords: totalWords - completed,
            accuracy,
            progressPercentage: Math.round((completed / totalWords) * 100)
        };
    }

    /**
     * Calculate accuracy for specific category
     * @param {Array} words - Words in category
     * @param {Object} wordAccuracy - Accuracy tracking data
     * @returns {number} Accuracy percentage
     */
    calculateCategoryAccuracy(words, wordAccuracy) {
        const categoryWords = words.map(w => w.word);
        let totalAttempts = 0;
        let correctAttempts = 0;

        categoryWords.forEach(word => {
            if (wordAccuracy[word]) {
                totalAttempts += wordAccuracy[word].total;
                correctAttempts += wordAccuracy[word].correct;
            }
        });

        return totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    }

    /**
     * Preload all word data for better performance.
     * Errors are only logged and not propagated.
     * Optionally calls a progress callback.
     * @param {(progress: {current: number, total: number, currentItem: {difficulty: string, category: string}}) => void} [onProgress]
     * @returns {Promise<{success: number, failed: number, details: Array<{difficulty: string, category: string, success: boolean}>}>}
     */
    async preloadAllWords(onProgress) {
        const loadResults = [];
        const loadPromises = [];

        const total = this.availableDifficulties.length * this.availableCategories.length;
        let completed = 0;

        this.availableDifficulties.forEach(difficulty => {
            this.availableCategories.forEach(category => {
                const promise = this.loadWords(difficulty, category)
                    .then(success => {
                        loadResults.push({ difficulty, category, success });
                        completed++;

                        if (onProgress) {
                            onProgress({
                                current: completed,
                                total,
                                currentItem: { difficulty, category }
                            });
                        }

                        return success;
                    });
                loadPromises.push(promise);
            });
        });

        let successCount = 0;
        let failCount = 0;

        try {
            await this.runWithConcurrencyLimit(loadPromises, 3); // Limit to 3 concurrent requests
            successCount = loadResults.filter(r => r.success).length;
            failCount = loadResults.filter(r => !r.success).length;
            console.log('All word data preloaded. Success:', successCount, 'Failed:', failCount);
        } catch (error) {
            console.warn('Some word data failed to preload:', error);
        }

        return {
            success: successCount,
            failed: failCount,
            details: loadResults
        };
    }


    /**
     * Helper to run promises with concurrency limit
     * @param {Array<Promise>} promises - Array of promise-returning functions
     * @param {number} limit - Max concurrent promises
     * @returns {Promise<void>}
     */
    async runWithConcurrencyLimit(promises, limit) {
        let i = 0;
        const results = [];
        const executing = [];

        const promiseFns = promises.map(p => () => p);

        while (i < promiseFns.length) {
            while (executing.length < limit && i < promiseFns.length) {
                const fn = promiseFns[i++];
                const p = fn().then(result => {
                    executing.splice(executing.indexOf(p), 1);
                    return result;
                });
                executing.push(p);
                results.push(p);
            }
            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }
        await Promise.all(results);
    }

    /**
     * Get word count for specific difficulty and category
     * @param {string} difficulty - Difficulty level
     * @param {string} category - Category name
     * @returns {Promise<number>} Number of words available
     */
    async getWordCount(difficulty = 'easy', category = 'general') {
        const cacheKey = `${difficulty}_${category}`;

        try {
            // Load words if not already loaded
            if (!this.words[cacheKey]) {
                await this.loadWords(difficulty, category);
            }

            const words = this.words[cacheKey];
            return words ? words.length : 0;

        } catch (error) {
            console.error('Error getting word count:', error);
            return 0;
        }
    }

    /**
     * Reset used words tracking
     */
    resetUsedWords() {
        this.usedWords.clear();
    }
}