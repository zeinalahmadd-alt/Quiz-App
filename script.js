// ==================== DOM ELEMENTS ====================
const screens = {
    start: document.getElementById('start-screen'),
    category: document.getElementById('category-screen'),
    difficulty: document.getElementById('difficulty-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    // Theme toggle
    themeToggle: document.getElementById('theme-toggle'),
    
    // Start screen
    startBtn: document.getElementById('start-btn'),
    
    // Category screen
    categoryCards: document.querySelectorAll('.category-card'),
    categoryBackBtn: document.getElementById('category-back-btn'),
    
    // Difficulty screen
    difficultyBtns: document.querySelectorAll('.difficulty-btn'),
    difficultyBackBtn: document.getElementById('difficulty-back-btn'),
    
    // Quiz screen
    questionCounter: document.getElementById('question-counter'),
    scoreDisplay: document.getElementById('score-display'),
    progressFill: document.getElementById('progress-fill'),
    timer: document.getElementById('timer'),
    timerValue: document.getElementById('timer-value'),
    questionText: document.getElementById('question-text'),
    answersGrid: document.getElementById('answers-grid'),
    answerBtns: document.querySelectorAll('.answer-btn'),
    nextBtn: document.getElementById('next-btn'),
    
    // Result screen
    resultIcon: document.getElementById('result-icon'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    finalScore: document.getElementById('final-score'),
    statCorrect: document.getElementById('stat-correct'),
    statWrong: document.getElementById('stat-wrong'),
    statTime: document.getElementById('stat-time'),
    restartBtn: document.getElementById('restart-btn'),
    homeBtn: document.getElementById('home-btn'),

    // Toast
    toastContainer: document.getElementById('toast-container'),

    // History (result screen)
    historyList: document.getElementById('history-list'),
    historyEmpty: document.getElementById('history-empty'),
    clearHistoryBtn: document.getElementById('clear-history-btn'),

    // History (start screen)
    startHistoryList: document.getElementById('start-history-list'),
    startHistoryEmpty: document.getElementById('start-history-empty'),
    clearHistoryBtnStart: document.getElementById('clear-history-btn-start')
};

// ==================== STATE ====================
let selectedCategory = null;
let selectedDifficulty = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let correct = 0;
let wrong = 0;
let timeLeft = 0;
let timer = null;
let totalTime = 0;
// ==================== DIFFICULTY SETTINGS ====================
const difficultySettings = {
    easy: { questionCount: 10, timePerQuestion: 30 },
    medium: { questionCount: 15, timePerQuestion: 20 },
    hard: { questionCount: 20, timePerQuestion: 10 }
};

// ==================== HISTORY STORAGE ====================
const HISTORY_STORAGE_KEY = 'quizAppAttemptHistory';

// Safely reads the attempt history from localStorage.
// Handles missing data and corrupted/invalid JSON gracefully.
function getAttemptHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        // Basic sanity check on each entry
        return parsed.filter(item => item && typeof item === 'object');
    } catch (err) {
        console.warn('Attempt history was corrupted, resetting it.', err);
        return [];
    }
}

// Safely writes the attempt history to localStorage.
function saveAttemptHistory(history) {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (err) {
        console.warn('Could not save attempt history.', err);
    }
}

// Adds a new attempt to the stored history (does not overwrite previous attempts).
function addAttemptToHistory(stats) {
    const history = getAttemptHistory();
    const attemptNumber = history.length + 1;

    history.push({
        attempt: attemptNumber,
        score: stats.score,
        correct: stats.correct,
        wrong: stats.wrong,
        avgTime: stats.avgTime,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        date: new Date().toISOString()
    });

    saveAttemptHistory(history);
    return history;
}

function clearAttemptHistory() {
    saveAttemptHistory([]);
    renderHistory();
}

function formatAttemptDate(isoString) {
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
            ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
        return '';
    }
}

// Builds the inner HTML markup for a single history item.
function buildHistoryItemHTML(item) {
    const avgTimeText = (typeof item.avgTime === 'number' && !isNaN(item.avgTime))
        ? `${item.avgTime.toFixed(1)}s`
        : '—';
    const dateText = formatAttemptDate(item.date);

    return `
        <div class="history-item-main">
            <span class="history-item-attempt">Attempt ${item.attempt}</span>
            ${dateText ? `<span class="history-item-date">${dateText}</span>` : ''}
        </div>
        <div class="history-item-stats">
            <div class="history-stat">
                <span class="history-stat-value">${item.score}</span>
                <span class="history-stat-label">Points</span>
            </div>
            <div class="history-stat">
                <span class="history-stat-value correct-color">${item.correct}</span>
                <span class="history-stat-label">Correct</span>
            </div>
            <div class="history-stat">
                <span class="history-stat-value wrong-color">${item.wrong}</span>
                <span class="history-stat-label">Wrong</span>
            </div>
            <div class="history-stat">
                <span class="history-stat-value">${avgTimeText}</span>
                <span class="history-stat-label">Avg Time</span>
            </div>
        </div>
    `;
}

// Fills a given list container + empty-state element with the current history.
function renderHistoryInto(listEl, emptyEl, history) {
    if (!listEl) return;
    listEl.innerHTML = '';

    if (history.length === 0) {
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');

    history.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        itemEl.innerHTML = buildHistoryItemHTML(item);
        listEl.appendChild(itemEl);
    });
}

// Renders the history list (most recent attempts first) into every visible history panel
// (the result screen side panel and the compact start screen card).
function renderHistory() {
    const history = getAttemptHistory();
    const sorted = [...history].reverse(); // most recent first

    renderHistoryInto(elements.historyList, elements.historyEmpty, sorted);
    renderHistoryInto(elements.startHistoryList, elements.startHistoryEmpty, sorted);
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(type, title, message) {
    if (!elements.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : '✕'}</span>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            ${message ? `<span class="toast-message">${message}</span>` : ''}
        </div>
    `;

    elements.toastContainer.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto-dismiss after a short delay
    const dismissDelay = 2200;
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        }, { once: true });
    }, dismissDelay);
}

// ==================== SCREEN NAVIGATION ====================
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the target screen
    screens[screenName].classList.add('active');
}

// ==================== CATEGORY SELECTION ====================
function selectCategory(category) {
    selectedCategory = category;
    
    // Update UI
    elements.categoryCards.forEach(card => {
        card.classList.remove('selected');
        if (card.dataset.category === category) {
            card.classList.add('selected');
        }
    });
}

// ==================== DIFFICULTY SELECTION ====================
function selectDifficulty(difficulty) {
    selectedDifficulty = difficulty;
    
    // Update UI
    elements.difficultyBtns.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.difficulty === difficulty) {
            btn.classList.add('selected');
        }
    });
}
function startQuiz() {
    currentQuestions = questions[selectedCategory][selectedDifficulty];
    currentQuestionIndex = 0;
    score = 0;
    timeLeft = difficultySettings[selectedDifficulty].timePerQuestion;
    totalTime = 0;
    loadQuestion();
}
// ==================== TIMER ====================
function updateTimerDisplay(timeLeft) {
    elements.timerValue.textContent = timeLeft;
    
    // Add warning classes based on time
    elements.timer.classList.remove('warning', 'danger');
    if (timeLeft <= 5) {
        elements.timer.classList.add('danger');
    } else if (timeLeft <= 10) {
        elements.timer.classList.add('warning');
    }
}

// ==================== PROGRESS BAR ====================
function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    elements.progressFill.style.width = `${percentage}%`;
}

// ==================== QUESTION DISPLAY ====================
function displayQuestion(question, questionNumber, totalQuestions) {
    elements.questionCounter.textContent = `Question ${questionNumber}/${totalQuestions}`;
    elements.questionText.textContent = question;
    
    // Reset answer buttons
    elements.answerBtns.forEach(btn => {
        btn.classList.remove('selected', 'correct', 'wrong', 'disabled');
        btn.disabled = false;
    });
    
    // Hide next button
    elements.nextBtn.classList.add('hidden');
}

function displayAnswers(answers) {
    const letters = ['A', 'B', 'C', 'D'];
    
    elements.answerBtns.forEach((btn, index) => {
        btn.querySelector('.answer-text').textContent = answers[index];
        btn.querySelector('.answer-letter').textContent = letters[index];
    });
}

// ==================== ANSWER FEEDBACK ====================
function showCorrectAnswer(correctIndex) {
    elements.answerBtns[correctIndex].classList.add('correct');
    disableAllAnswers();
}

function showWrongAnswer(selectedIndex, correctIndex) {
    elements.answerBtns[selectedIndex].classList.add('wrong');
    elements.answerBtns[correctIndex].classList.add('correct');
    disableAllAnswers();
}

function disableAllAnswers() {
    elements.answerBtns.forEach(btn => {
        btn.classList.add('disabled');
        btn.disabled = true;
    });
}

function showNextButton() {
    elements.nextBtn.classList.remove('hidden');
}
// ==================LOAD QUESTION==================== 
function loadQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    displayQuestion(
        question.question,
        currentQuestionIndex + 1,
        currentQuestions.length
    );
    displayAnswers(question.answers);
    timeLeft = difficultySettings[selectedDifficulty].timePerQuestion;
    startTimer();
}
function nextQuestion() {
    const questionTime = difficultySettings[selectedDifficulty].timePerQuestion - timeLeft;
    totalTime += questionTime;
    if (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    loadQuestion();
    }else {
    const avgTime = totalTime / currentQuestions.length;
    const stats = {
            score: score,
            correct: correct,
            wrong: wrong,
            avgTime: avgTime,
            totalQuestions: currentQuestions.length
        };
        console.log('Total time:', totalTime);
        console.log('Average time:', avgTime);
    addAttemptToHistory(stats);
    showResults(stats);
    renderHistory();
    showScreen('result');
    }
    console.log('Next question');
}
// ==================== SCORE ====================
function updateScore(score) {
    elements.scoreDisplay.textContent = `Score: ${score}`;
}
// ==================== TIMER ====================
function startTimer() {
    clearInterval(timer);

    timer = setInterval(() => {
        timeLeft--;

        if (timeLeft <= 0) {
            timeLeft = 0;
            updateTimerDisplay(timeLeft);
            clearInterval(timer);
            nextQuestion();
            return;
        }

        updateTimerDisplay(timeLeft);
    }, 1000);
}
// ==================== RESULT SCREEN ====================
function showResults(stats) {
    const { score, correct, wrong, avgTime, totalQuestions } = stats;
    
    elements.finalScore.textContent = score;
    elements.statCorrect.textContent = correct;
    elements.statWrong.textContent = wrong;
    elements.statTime.textContent = `${avgTime.toFixed(1)}s`;
    
    // Set result message based on performance
    const percentage = (correct / totalQuestions) * 100;
    
    if (percentage >= 80) {
        elements.resultIcon.textContent = '🏆';
        elements.resultTitle.textContent = 'Excellent!';
        elements.resultMessage.textContent = 'You really know your stuff!';
    } else if (percentage >= 60) {
        elements.resultIcon.textContent = '👏';
        elements.resultTitle.textContent = 'Good Job!';
        elements.resultMessage.textContent = 'Keep practicing to improve!';
    } else if (percentage >= 40) {
        elements.resultIcon.textContent = '📚';
        elements.resultTitle.textContent = 'Not Bad!';
        elements.resultMessage.textContent = 'Room for improvement!';
    } else {
        elements.resultIcon.textContent = '💪';
        elements.resultTitle.textContent = 'Keep Trying!';
        elements.resultMessage.textContent = 'Practice makes perfect!';
    }
}

// ==================== RESET ====================
function resetQuiz() {
    selectedCategory = null;
    selectedDifficulty = null;
    currentQuestions = [];
    currentQuestionIndex = 0;
    score = 0;
    correct = 0;
    wrong = 0;
    totalTime = 0;
    timeLeft = 0;
    clearInterval(timer);

    elements.categoryCards.forEach(card => card.classList.remove('selected'));
    elements.difficultyBtns.forEach(btn => btn.classList.remove('selected'));
    updateScore(0);
    updateProgress(0, 1);
    updateTimerDisplay(30);
}

// ==================== EVENT LISTENERS ====================

// Start button
elements.startBtn.addEventListener('click', () => {
    showScreen('category');
});

// Category cards
elements.categoryCards.forEach(card => {
    card.addEventListener('click', () => {
        selectCategory(card.dataset.category);
        
        // TODO: Store selected category
        // TODO: Move to difficulty selection after a short delay
        setTimeout(() => {
            showScreen('difficulty');
        }, 300);
    });
});

// Category back button
elements.categoryBackBtn.addEventListener('click', () => {
    showScreen('start');
});

// Difficulty buttons
elements.difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        selectDifficulty(btn.dataset.difficulty);
        
        // TODO: Start the quiz with selected category and difficulty
        // TODO: Load questions based on category and difficulty
        // TODO: Show quiz screen
        startQuiz();
        setTimeout(() => {
            showScreen('quiz');
        }, 300);
    });
});

// Difficulty back button
elements.difficultyBackBtn.addEventListener('click', () => {
    showScreen('category');
});

// Answer buttons
elements.answerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.disabled) return;
        // TODO: Check if answer is already selected
        // TODO: Get selected answer index
        // TODO: Check if answer is correct
        // TODO: Update score
        // TODO: Show correct/wrong feedback
        // TODO: Show next button
        const selectedIndex = parseInt(btn.dataset.index);
        const question = currentQuestions[currentQuestionIndex];
        const isCorrect = selectedIndex === question.correct;
        if (isCorrect) {
            score++;
            correct++;
            updateScore(score);
        } else {
            wrong++;
        }
        if (isCorrect) {
            showCorrectAnswer(question.correct);
            showToast('success', 'Correct!', 'Great job, keep it up.');
        } else {
            showWrongAnswer(selectedIndex, question.correct);
            showToast('error', 'Wrong Answer', 'The correct answer is highlighted.');
        }
        elements.nextBtn.classList.remove('hidden');
        console.log(correct, wrong);
        console.log('Selected answer:', selectedIndex);
        console.log('Correct answer:',isCorrect);
    });
});

// Next button
elements.nextBtn.addEventListener('click', () => {
    // TODO: Check if there are more questions
    // TODO: If yes, load next question
    // TODO: If no, show results
    nextQuestion();
});

// Restart button
elements.restartBtn.addEventListener('click', () => {
    resetQuiz();
    showScreen('category');
});

// Home button
elements.homeBtn.addEventListener('click', () => {
    resetQuiz();
    showScreen('start');
});

// Clear history button (result screen)
if (elements.clearHistoryBtn) {
    elements.clearHistoryBtn.addEventListener('click', () => {
        clearAttemptHistory();
    });
}

// Clear history button (start screen)
if (elements.clearHistoryBtnStart) {
    elements.clearHistoryBtnStart.addEventListener('click', () => {
        clearAttemptHistory();
    });
}

// ==================== INITIALIZE ====================
console.log('Quiz App loaded!');
renderHistory();

// ==================== THEME TOGGLE ====================
let isDarkMode = true;

function updateThemeIcon() {
    elements.themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('light', !isDarkMode);
    updateThemeIcon();
    localStorage.setItem('darkMode', isDarkMode);
}

// Load saved theme
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode !== null) {
    isDarkMode = savedDarkMode === 'true';
    document.body.classList.toggle('light', !isDarkMode);
}
updateThemeIcon();

elements.themeToggle.addEventListener('click', toggleTheme);
