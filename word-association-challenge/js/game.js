/**
 * Game Controller for Word Association Challenge
 * Fixed timer functionality and initialization issues
 */

class WordAssociationGame {
    constructor() {
        this.storage = new StorageManager();
        this.wordManager = new WordManager(this.storage);

        this.currentWord = null;
        this.gameActive = false;
        this.score = 0;
        this.streak = 0;
        this.level = 1;

        // Timer properties - Fixed initialization
        this.timer = null;
        this.timeLeft = 30;
        this.timerDuration = 30;

        // Game settings
        this.settings = {
            difficulty: 'easy',
            category: 'general',
            ...this.storage.getPreferences()
        };

        // Initialize game
        this.init();
    }

    /**
     * Initialize game
     */
    async init() {
        try {
            console.log('Initializing Word Association Game...');

            await this.setupUI();
            await this.loadGameState();
            await this.preloadWords();
            await this.startNewGame();

            console.log('Game initialization complete!');
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.showNotification('Failed to initialize game. Using offline mode.', 'warning');
            await this.startNewGame();
        }
    }

    /**
     * Setup UI event listeners and initial state
     */
    async setupUI() {
        console.log('Setting up UI...');

        // Difficulty selector
        const difficultyBtns = document.querySelectorAll('.difficulty-btn');
        difficultyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.changeDifficulty(e.target.dataset.level);
            });
        });

        // Category selector
        const categorySelector = document.getElementById('categorySelector');
        if (categorySelector) {
            categorySelector.addEventListener('change', (e) => {
                this.changeCategory(e.target.value);
            });
        }

        // Next word button
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextWord();
            });
        }

        // Play again button
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.playAgain();
            });
        }

        // Reset progress button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showResetConfirmation();
            });
        }

        // Progress button
        const progressBtn = document.getElementById('progressBtn');
        if (progressBtn) {
            progressBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProgress();
            });
        }

        // Set initial difficulty and category
        this.setActiveDifficulty(this.settings.difficulty);
        if (categorySelector) {
            categorySelector.value = this.settings.category;
        }

        // Initialize timer display
        this.updateTimerDisplay();

        console.log('UI setup complete');
    }

    /**
     * Load game state from storage
     */
    async loadGameState() {
        console.log('Loading game state...');

        const stats = this.storage.getStats();
        this.score = stats.totalScore || 0;
        this.streak = stats.currentStreak || 0;
        this.level = stats.level || 1;

        this.updateStatsDisplay();
        console.log('Game state loaded:', { score: this.score, streak: this.streak, level: this.level });
    }

    /**
     * Preload words with progress indication
     */
    async preloadWords() {
        console.log('Preloading words...');
        this.showLoading(true);

        try {
            const results = await this.wordManager.preloadAllWords((progress) => {
                console.log(`Loading progress: ${progress.current}/${progress.total} - ${progress.currentItem}`);
            });

            console.log('Preload results:', results);

            if (results.success === 0) {
                throw new Error('No word data could be loaded');
            }

            this.showNotification(`Loaded ${results.success} word sets successfully!`, 'success');

        } catch (error) {
            console.warn('Preload failed:', error);
            this.showNotification('Using limited word set. Some features may not work.', 'warning');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Start new game
     */
    async startNewGame() {
        console.log('Starting new game...');

        this.gameActive = false;
        this.clearTimer();
        this.hideGameEnd();

        await this.loadNextWord();
    }

    /**
     * Start the countdown timer - Fixed implementation
     */
    startTimer() {
        this.clearTimer();
        this.timeLeft = this.timerDuration;
        this.updateTimerDisplay();

        console.log('Starting timer:', this.timeLeft);

        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.handleTimeOut();
            }
        }, 1000);
    }

    /**
     * Clear the countdown timer
     */
    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            console.log('Timer cleared');
        }
    }

    /**
 * Update timer display - Fixed to avoid readonly property issues
 */
    updateTimerDisplay() {
        try {
            const timerText = document.getElementById('timerText');
            const timerProgress = document.getElementById('timerProgress');

            if (timerText) {
                timerText.textContent = this.timeLeft;

                // Reset classes first
                timerText.classList.remove('danger', 'warning');

                // Add appropriate class based on time left
                if (this.timeLeft <= 5) {
                    timerText.classList.add('danger');
                } else if (this.timeLeft <= 10) {
                    timerText.classList.add('warning');
                }
            }

            if (timerProgress) {
                const percentage = Math.max(0, Math.min(1, this.timeLeft / this.timerDuration));
                const circumference = 2 * Math.PI * 45; // radius = 45
                const offset = circumference * (1 - percentage);

                // Use setAttribute for SVG stroke-dashoffset
                timerProgress.setAttribute('stroke-dashoffset', offset.toString());

                // Handle SVG classes more carefully to avoid readonly issues
                timerProgress.classList.remove('danger', 'warning');

                if (this.timeLeft <= 5) {
                    timerProgress.classList.add('danger');
                } else if (this.timeLeft <= 10) {
                    timerProgress.classList.add('warning');
                }
            }
        } catch (error) {
            console.error('Error in updateTimerDisplay:', error);
            // Fallback: just update the text if SVG fails
            const timerText = document.getElementById('timerText');
            if (timerText) {
                timerText.textContent = this.timeLeft;
            }
        }
    }

    /**
     * Show progress modal with enhanced statistics - Fixed method calls
     */
    async showProgress() {
        console.log('Showing progress modal');

        try {
            // Get current category progress
            const progress = await this.wordManager.getProgress(
                this.settings.difficulty,
                this.settings.category
            );

            // Get overall statistics
            const stats = this.storage.getStats();
            const difficultyStats = this.storage.getDifficultyStats();

            // Get word manager statistics instead of non-existent getOverallStats
            const categories = this.wordManager.getCategories();
            const difficulties = this.wordManager.getDifficulties();

            // Calculate available word count
            let totalWordsAvailable = 0;
            let categoriesLoaded = 0;

            try {
                for (const category of categories) {
                    for (const difficulty of difficulties) {
                        const count = await this.wordManager.getWordCount(difficulty, category);
                        if (count > 0) {
                            totalWordsAvailable += count;
                            if (difficulty === 'easy') { // Count category only once
                                categoriesLoaded++;
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not calculate total words:', e);
                totalWordsAvailable = 'Unknown';
                categoriesLoaded = 'Unknown';
            }

            // Create difficulty breakdown HTML
            const difficultyBreakdown = Object.entries(difficultyStats)
                .map(([difficulty, data]) => `
                <div class="difficulty-stat">
                    <span class="difficulty-name">${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}:</span>
                    <span class="difficulty-percentage">${data.accuracy}% (${data.correct}/${data.total})</span>
                </div>
            `).join('');

            const progressHTML = `
            <div class="modal-content">
                <h3>📊 Your Progress</h3>
                <div class="progress-stats">
                    <div class="stat-group">
                        <h4>Current: ${this.settings.difficulty} - ${this.settings.category}</h4>
                        <p><strong>Words Completed:</strong> ${progress.completedWords}/${progress.totalWords}</p>
                        <p><strong>Progress:</strong> ${progress.progressPercentage}%</p>
                        <p><strong>Category Accuracy:</strong> ${progress.accuracy}%</p>
                    </div>
                    
                    <div class="stat-group">
                        <h4>🎯 Overall Statistics</h4>
                        <p><strong>Total Score:</strong> ${stats.totalScore.toLocaleString()}</p>
                        <p><strong>Best Streak:</strong> ${stats.bestStreak}</p>
                        <p><strong>Current Level:</strong> ${stats.level}</p>
                        <p><strong>Words Attempted:</strong> ${stats.totalWords}</p>
                        <p><strong>Average Accuracy:</strong> ${stats.averageAccuracy}%</p>
                    </div>
                    
                    <div class="stat-group">
                        <h4>📈 Difficulty Performance</h4>
                        <div class="difficulty-breakdown">
                            ${difficultyBreakdown || '<p>No difficulty data available yet.</p>'}
                        </div>
                    </div>

                    <div class="stat-group">
                        <h4>📚 Word Library</h4>
                        <p><strong>Total Words Available:</strong> ${typeof totalWordsAvailable === 'number' ? totalWordsAvailable.toLocaleString() : totalWordsAvailable}</p>
                        <p><strong>Words Completed:</strong> ${stats.totalWords.toLocaleString()}</p>
                        <p><strong>Categories Available:</strong> ${categories.length}</p>
                        <p><strong>Categories with Data:</strong> ${categoriesLoaded}</p>
                        <p><strong>Difficulty Levels:</strong> ${difficulties.length}</p>
                    </div>
                </div>
                <div class="settings-buttons">
                    <button onclick="this.closest('.modal').remove()" class="btn">Close</button>
                </div>
            </div>
        `;

            this.showModal(progressHTML);

        } catch (error) {
            console.error('Error showing progress:', error);

            // Show a simplified progress modal if full stats fail
            const stats = this.storage.getStats();
            const simpleProgressHTML = `
            <div class="modal-content">
                <h3>📊 Your Progress</h3>
                <div class="progress-stats">
                    <div class="stat-group">
                        <h4>🎯 Basic Statistics</h4>
                        <p><strong>Total Score:</strong> ${stats.totalScore.toLocaleString()}</p>
                        <p><strong>Current Streak:</strong> ${stats.currentStreak}</p>
                        <p><strong>Best Streak:</strong> ${stats.bestStreak}</p>
                        <p><strong>Current Level:</strong> ${stats.level}</p>
                        <p><strong>Words Attempted:</strong> ${stats.totalWords}</p>
                        <p><strong>Average Accuracy:</strong> ${stats.averageAccuracy}%</p>
                    </div>
                    <div class="stat-group">
                        <p><em>Detailed statistics temporarily unavailable.</em></p>
                    </div>
                </div>
                <div class="settings-buttons">
                    <button onclick="this.closest('.modal').remove()" class="btn">Close</button>
                </div>
            </div>
        `;

            this.showModal(simpleProgressHTML);
        }
    }

    /**
     * Handle timer timeout
     */
    async handleTimeOut() {
        if (!this.gameActive) return;

        console.log('Time out!');
        this.gameActive = false;
        this.clearTimer();

        // Mark all options as disabled and show correct answer
        const options = document.querySelectorAll('.option');
        options.forEach(opt => {
            opt.style.pointerEvents = 'none';

            if (opt.dataset.option === this.currentWord.correctAnswer) {
                opt.classList.add('correct');
            } else {
                opt.classList.add('faded');
            }
        });

        // Update stats for timeout (incorrect)
        this.updateGameStats(false);

        // Track word progress as incorrect
        this.trackWordProgress(false);

        // Show timeout feedback
        this.showTimeoutFeedback();

        // Show next button
        this.showNextButton();
    }

    /**
     * Show timeout feedback
     */
    showTimeoutFeedback() {
        const feedbackEl = document.getElementById('feedback');
        if (!feedbackEl) return;

        feedbackEl.classList.remove('correct', 'incorrect');
        feedbackEl.classList.add('show', 'incorrect');

        feedbackEl.innerHTML = `
            <strong>⏰ Time's up!</strong><br>
            The correct answer is: <em>"${this.currentWord.correctAnswer}"</em>
        `;
    }

    /**
     * Load next word and display
     */
    async loadNextWord() {
        try {
            console.log(`Loading next word for ${this.settings.difficulty}/${this.settings.category}...`);
            this.showLoading(true);

            const nextWord = await this.wordManager.getNextWord(
                this.settings.difficulty,
                this.settings.category
            );

            // Handle end-of-category case
            if (nextWord?.endOfCategory) {
                console.log(nextWord.message);
                this.showGameEnd(nextWord); // pass metadata so UI can show a message
                return;
            }

            // Handle no words
            if (!nextWord) {
                console.log('No more words available');
                this.showGameEnd();
                return;
            }

            // Normal case: got a word
            this.currentWord = nextWord;
            console.log('Loaded word:', this.currentWord.word);

            this.displayWord();
            this.gameActive = true;
            this.startTimer();

        } catch (error) {
            console.error('Error loading word:', error);
            this.showNotification('Error loading word. Please try again.', 'error');

            // Try again with a short delay
            setTimeout(() => this.loadNextWord(), 2000);
        } finally {
            this.showLoading(false);
        }
    }


    /**
     * Display current word and options
     */
    displayWord() {
        console.log('Displaying word:', this.currentWord.word);

        // Update word display
        const wordElement = document.getElementById('currentWord');
        const pronunciationElement = document.querySelector('.pronunciation');

        if (wordElement) {
            wordElement.textContent = this.currentWord.word;
        }

        if (pronunciationElement) {
            pronunciationElement.textContent = this.currentWord.pronunciation;
        }

        // Create options
        const optionsContainer = document.getElementById('options');
        if (optionsContainer) {
            optionsContainer.innerHTML = '';

            this.currentWord.options.forEach((option, index) => {
                const optionEl = document.createElement('div');
                optionEl.className = 'option';
                optionEl.textContent = option;
                optionEl.dataset.option = option;
                optionEl.dataset.index = index;
                optionEl.addEventListener('click', (e) => this.handleAnswer(e));

                // Add accessibility attributes
                optionEl.setAttribute('role', 'button');
                optionEl.setAttribute('tabindex', '0');
                optionEl.setAttribute('aria-label', `Option ${index + 1}: ${option}`);

                // Add keyboard support
                optionEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.handleAnswer(e);
                    }
                });

                optionsContainer.appendChild(optionEl);
            });
        }

        // Reset UI state
        this.hideFeedback();
        this.hideNextButton();
    }

    /**
     * Handle answer selection
     * @param {Event} event - Click/keyboard event
     */
    async handleAnswer(event) {
        if (!this.gameActive || !this.currentWord) return;

        console.log('Answer selected');
        this.gameActive = false;
        this.clearTimer();

        const selectedOption = event.target.dataset.option;
        const isCorrect = selectedOption === this.currentWord.correctAnswer;

        console.log('Answer correct:', isCorrect);

        // Visual feedback
        this.showAnswerFeedback(event.target, isCorrect);

        // Update statistics
        this.updateGameStats(isCorrect);

        // Track word progress
        this.trackWordProgress(isCorrect);

        // Show feedback
        this.showFeedback(isCorrect);

        // Show next button
        this.showNextButton();
    }

    /**
     * Show visual feedback for selected answer
     * @param {Element} selectedElement - Selected option element
     * @param {boolean} isCorrect - Whether answer is correct
     */
    showAnswerFeedback(selectedElement, isCorrect) {
        const options = document.querySelectorAll('.option');

        // Disable all options
        options.forEach(opt => {
            opt.style.pointerEvents = 'none';

            // Highlight correct answer
            if (opt.dataset.option === this.currentWord.correctAnswer) {
                opt.classList.add('correct');
            }
            // Show incorrect selection
            else if (opt === selectedElement && !isCorrect) {
                opt.classList.add('incorrect');
            }
            // Fade other options
            else if (opt !== selectedElement && opt.dataset.option !== this.currentWord.correctAnswer) {
                opt.classList.add('faded');
            }
        });
    }

    /**
     * Update game statistics
     * @param {boolean} isCorrect - Whether answer is correct
     */
    updateGameStats(isCorrect) {
        if (isCorrect) {
            const points = this.calculatePoints();
            this.score += points;
            this.streak++;

            // Level up every 5 correct answers
            if (this.streak > 0 && this.streak % 5 === 0) {
                this.level++;
                this.showLevelUp();
            }

            this.storage.updateStats({
                scoreIncrease: points,
                streak: this.streak,
                level: this.level,
                correctAnswer: true,
                wordCompleted: true,
                difficulty: this.settings.difficulty
            });
        } else {
            this.streak = 0;
            this.storage.updateStats({
                streak: this.streak,
                correctAnswer: false,
                wordCompleted: true,
                difficulty: this.settings.difficulty
            });
        }

        this.updateStatsDisplay();
    }

    /**
     * Calculate points based on difficulty, streak, and time remaining
     * @returns {number} Points earned
     */
    calculatePoints() {
        const basePoints = {
            'easy': 5,
            'medium': 10,
            'hard': 15
        };

        const base = basePoints[this.settings.difficulty] || 5;
        const streakBonus = Math.floor(this.streak / 3) * 2;
        const timeBonus = this.timeLeft > 20 ? 5 : this.timeLeft > 10 ? 2 : 0;

        return base + streakBonus + timeBonus;
    }

    /**
     * Track word-specific progress
     * @param {boolean} isCorrect - Whether answer is correct
     */
    trackWordProgress(isCorrect) {
        if (!this.currentWord) return;

        const word = this.currentWord.word;
        const difficulty = this.settings.difficulty;

        // Update word accuracy
        this.storage.updateWordAccuracy(word, isCorrect);

        // Update difficulty-specific accuracy
        this.storage.updateDifficultyAccuracy(difficulty, isCorrect);

        // Track completed/missed words
        this.storage.addCompletedWord(word);

        if (isCorrect) {
            // Remove from missed words if answered correctly
            this.storage.removeMissedWord(word);
        } else {
            // Add to missed words for future repetition
            this.storage.addMissedWord(word);
        }
    }

    /**
     * Show feedback message
     * @param {boolean} isCorrect - Whether answer is correct
     */
    showFeedback(isCorrect) {
        const feedbackEl = document.getElementById('feedback');
        if (!feedbackEl) return;

        feedbackEl.classList.remove('correct', 'incorrect');
        feedbackEl.classList.add('show', isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
            const points = this.calculatePoints();
            const timeBonus = this.timeLeft > 20 ? ' + Time bonus!' : this.timeLeft > 10 ? ' + Quick bonus!' : '';
            feedbackEl.innerHTML = `
                <strong>✓ Correct! +${points} points</strong><br>
                Great job! You're on a ${this.streak} word streak!${timeBonus}
            `;
        } else {
            feedbackEl.innerHTML = `
                <strong>✗ Incorrect!</strong><br>
                The correct answer is: <em>"${this.currentWord.correctAnswer}"</em>
            `;
        }
    }

    /**
     * Hide feedback message
     */
    hideFeedback() {
        const feedbackEl = document.getElementById('feedback');
        if (feedbackEl) {
            feedbackEl.classList.remove('show', 'correct', 'incorrect');
        }
    }

    /**
     * Show next word button
     */
    showNextButton() {
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.style.display = 'block';
        }
    }

    /**
     * Hide next word button
     */
    hideNextButton() {
        const nextBtn = document.getElementById('nextBtn');
        if (nextBtn) {
            nextBtn.style.display = 'none';
        }
    }

    /**
     * Show game end section
     */
    async showGameEnd() {
        console.log('Showing game end');

        const gameEndEl = document.getElementById('gameEnd');
        const gameEndMessage = document.getElementById('gameEndMessage');
        const playAgainBtn = document.getElementById('playAgainBtn');

        if (gameEndEl) {
            gameEndEl.classList.add('show');
        }

        if (gameEndMessage) {
            // Get dynamic word count for current category
            const wordCount = await this.wordManager.getWordCount(
                this.settings.difficulty,
                this.settings.category
            );

            gameEndMessage.textContent = `You've completed all ${wordCount} words in ${this.settings.difficulty} ${this.settings.category}! 🎉`;
        }

        if (playAgainBtn) {
            playAgainBtn.style.display = 'block';
        }

        this.hideNextButton();
        this.clearTimer();
    }

    /**
     * Hide game end section
     */
    hideGameEnd() {
        const gameEndEl = document.getElementById('gameEnd');
        const playAgainBtn = document.getElementById('playAgainBtn');

        if (gameEndEl) {
            gameEndEl.classList.remove('show');
        }

        if (playAgainBtn) {
            playAgainBtn.style.display = 'none';
        }
    }

    /**
     * Play again functionality
     */
    async playAgain() {
        console.log('Play again requested');

        // Reset used words for current difficulty/category
        this.wordManager.resetUsedWords();

        // Hide game end section
        this.hideGameEnd();

        // Start new game
        await this.startNewGame();

        this.showNotification('New game started! 🎮', 'success');
    }

    /**
     * Move to next word
     */
    async nextWord() {
        console.log('Next word requested');
        await this.loadNextWord();
    }

    /**
     * Update statistics display
     */
    updateStatsDisplay() {
        const scoreEl = document.getElementById('score');
        const streakEl = document.getElementById('streak');
        const levelEl = document.getElementById('level');

        if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
        if (streakEl) streakEl.textContent = this.streak;
        if (levelEl) levelEl.textContent = this.level;
    }

    /**
     * Change difficulty level
     * @param {string} difficulty - New difficulty level
     */
    async changeDifficulty(difficulty) {
        if (this.settings.difficulty === difficulty || !difficulty) return;

        console.log('Changing difficulty to:', difficulty);
        this.clearTimer();

        this.settings.difficulty = difficulty;
        this.storage.updatePreferences({ difficulty });
        this.setActiveDifficulty(difficulty);

        // Reset used words for new difficulty
        this.wordManager.resetUsedWords();

        // Hide game end if showing
        this.hideGameEnd();

        await this.loadNextWord();
        this.showNotification(`Switched to ${difficulty} mode! 📈`, 'info');
    }

    /**
     * Set active difficulty button
     * @param {string} difficulty - Active difficulty
     */
    setActiveDifficulty(difficulty) {
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
            if (btn.dataset.level === difficulty) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            }
        });
    }

    /**
     * Change category
     * @param {string} category - New category
     */
    async changeCategory(category) {
        if (this.settings.category === category || !category) return;

        console.log('Changing category to:', category);
        this.clearTimer();

        this.settings.category = category;
        this.storage.updatePreferences({ category });

        // Reset used words for new category
        this.wordManager.resetUsedWords();

        // Hide game end if showing
        this.hideGameEnd();

        await this.loadNextWord();
        this.showNotification(`Switched to ${category} category! 📚`, 'info');
    }

    /**
     * Show level up animation
     */
    showLevelUp() {
        this.showNotification(`🎉 Level Up! You're now level ${this.level}!`, 'success');

        // Add some visual flair to the level display
        const levelEl = document.getElementById('level');
        if (levelEl) {
            levelEl.style.transform = 'scale(1.2)';
            levelEl.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
                levelEl.style.transform = 'scale(1)';
            }, 300);
        }
    }

    /**
     * Show loading state
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        }

        // Disable interactive elements during loading
        const interactiveElements = [
            ...document.querySelectorAll('.option'),
            ...document.querySelectorAll('.difficulty-btn'),
            document.getElementById('categorySelector'),
            document.getElementById('nextBtn'),
            document.getElementById('playAgainBtn')
        ].filter(el => el !== null);

        interactiveElements.forEach(el => {
            if (show) {
                el.style.pointerEvents = 'none';
                el.style.opacity = '0.6';
            } else {
                el.style.pointerEvents = '';
                el.style.opacity = '';
            }
        });
    }

    /**
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        console.log('Notification:', message, type);

        // Create notification if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.className = `notification ${type} show`;

        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (notification) {
                notification.classList.remove('show');
            }
        }, 4000);
    }


    /**
     * Show reset confirmation
     */
    showResetConfirmation() {
        const confirmHTML = `
            <div class="modal-content">
                <h3>🔄 Reset Progress</h3>
                <p>Are you sure you want to reset all progress? This will:</p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>Clear all scores and statistics</li>
                    <li>Reset word completion tracking</li>
                    <li>Remove accuracy data</li>
                    <li>Reset level and streak</li>
                </ul>
                <p><strong>This action cannot be undone!</strong></p>
                <div class="settings-buttons">
                    <button onclick="wordGame.resetProgress()" class="btn danger">Reset Everything</button>
                    <button onclick="this.closest('.modal').remove()" class="btn secondary">Cancel</button>
                </div>
            </div>
        `;

        this.showModal(confirmHTML);
    }

    /**
     * Reset all progress
     */
    async resetProgress() {
        console.log('Resetting all progress');

        try {
            // Reset storage
            this.storage.resetProgress();

            // Reset game state
            this.score = 0;
            this.streak = 0;
            this.level = 1;

            // Reset word manager
            this.wordManager.resetUsedWords();
            this.clearTimer();

            // Update display
            this.updateStatsDisplay();

            // Close modal
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
            }

            // Show success notification
            this.showNotification('All progress has been reset! 🔄', 'success');

            // Hide game end if showing and start new game
            this.hideGameEnd();
            await this.loadNextWord();

        } catch (error) {
            console.error('Error resetting progress:', error);
            this.showNotification('Failed to reset progress. Please try again.', 'error');
        }
    }

    /**
     * Show modal dialog
     * @param {string} content - HTML content for modal
     */
    showModal(content) {
        // Remove existing modal
        const existingModal = document.querySelector('.modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            ${content}
        `;

        document.body.appendChild(modal);

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Restore body scroll when modal closes
        const closeModal = () => {
            document.body.style.overflow = '';
            modal.remove();
        };

        // Add close event listeners
        modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Focus management for accessibility
        const focusableElements = modal.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }

    /**
     * Handle cleanup when page unloads
     */
    cleanup() {
        this.clearTimer();
        console.log('Game cleanup completed');
    }
}

// Global game instance
let wordGame = null;

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing game...');

    try {
        wordGame = new WordAssociationGame();
    } catch (error) {
        console.error('Failed to create game instance:', error);

        // Show error notification
        const notification = document.createElement('div');
        notification.className = 'notification error show';
        notification.textContent = 'Failed to initialize game. Please refresh the page.';
        document.body.appendChild(notification);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wordGame) {
        console.log('Page became visible, refreshing stats');
        wordGame.updateStatsDisplay();
    } else if (document.visibilityState === 'hidden' && wordGame) {
        console.log('Page became hidden, clearing timer');
        wordGame.clearTimer();
    }
});

// Cleanup timer when page unloads
window.addEventListener('beforeunload', () => {
    if (wordGame) {
        wordGame.cleanup();
    }
});

// Add global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);

    if (wordGame) {
        wordGame.showNotification('An error occurred. The game will continue.', 'warning');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    if (wordGame) {
        wordGame.showNotification('A background error occurred. Functionality may be limited.', 'warning');
    }

    // Prevent the default behavior (which would log to console)
    event.preventDefault();
});