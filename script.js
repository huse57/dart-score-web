/* Global Game State */
let state = {
    gameMode: '501',
    activeFace: 1,
    maxRounds: 0,
    multiplier: 1,
    players: [],
    activeIdx: 0,
    currentTurnDarts: [],
    history: [],
    isFinished: false
};

// Initialize state on page load
window.onload = function() {
    toggleModeOptions();
    openModal('setupModal');
};

/* Toggle Setup Dropdowns based on active board selection */
function toggleModeOptions() {
    const face = parseInt(document.getElementById('setupFaceSelect').value);
    document.getElementById('face1ModeGroup').style.display = face === 1 ? 'block' : 'none';
    document.getElementById('face2ModeGroup').style.display = face === 2 ? 'block' : 'none';
}

/* Vanilla Modal Controllers */
function openModal(id) {
    document.getElementById(id).classList.add('show');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

/* Player Configuration Controls */
function addPlayerInput() {
    const container = document.getElementById('playerInputContainer');
    const count = container.children.length;
    if (count < 6) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control player-input-name';
        input.value = `Player ${count + 1}`;
        container.appendChild(input);
    }
}

function removePlayerInput() {
    const container = document.getElementById('playerInputContainer');
    if (container.children.length > 1) {
        container.removeChild(container.lastChild);
    }
}

/* Start Match Logic */
function startMatch() {
    const face = parseInt(document.getElementById('setupFaceSelect').value);
    let mode = '501';
    let rounds = 0;

    if (face === 1) {
        mode = document.getElementById('setupGameMode').value;
    } else {
        const roundVal = document.getElementById('setupRoundsSelect').value;
        if (roundVal === 'COUNTUP') {
            mode = 'COUNTUP';
            rounds = 0;
        } else {
            mode = `${roundVal}-ROUNDS`;
            rounds = parseInt(roundVal);
        }
    }

    const playerInputs = document.querySelectorAll('.player-input-name');
    const isCountdown = face === 1 && mode !== 'COUNTUP';
    const startScore = isCountdown ? parseInt(mode) : 0;

    state.gameMode = mode;
    state.activeFace = face;
    state.maxRounds = rounds;
    state.multiplier = 1;
    state.activeIdx = 0;
    state.currentTurnDarts = [];
    state.history = [];
    state.isFinished = false;
    state.players = [];

    playerInputs.forEach((inp, idx) => {
        const name = inp.value.trim() || `Player ${idx + 1}`;
        state.players.push({
            name: name,
            score: startScore,
            startingScore: startScore,
            turnStartScore: startScore,
            totalDarts: 0,
            currentRound: 1
        });
    });

    closeModal('setupModal');
    switchFace(face);
    updateUI();
    resetTimer();
}

/* Dynamic Face Panel Switching */
function switchFace(faceNum) {
    state.activeFace = faceNum;
    const tab1 = document.getElementById('tabFace1');
    const tab2 = document.getElementById('tabFace2');
    const panel1 = document.getElementById('face1Panel');
    const panel2 = document.getElementById('face2Panel');
    const spotlight = document.getElementById('activeSpotlightCard');
    const nextBtn = document.getElementById('nextPlayerBtn');

    if (faceNum === 1) {
        tab1.className = 'tab-btn active-face1';
        tab2.className = 'tab-btn';
        panel1.style.display = 'block';
        panel2.style.display = 'none';
        spotlight.classList.remove('face2-active');
        nextBtn.className = 'btn btn-success';
    } else {
        tab2.className = 'tab-btn active-face2';
        tab1.className = 'tab-btn';
        panel1.style.display = 'none';
        panel2.style.display = 'block';
        spotlight.classList.add('face2-active');
        nextBtn.className = 'btn btn-violet';
    }
    updateUI();
}

/* Face 1 Multiplier Handler */
function setMultiplier(mult) {
    state.multiplier = mult;
    const badge = document.getElementById('previewScoreBadge');
    badge.textContent = `${mult}x Multiplier`;
    
    document.querySelectorAll('.btn-mult').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.getAttribute('data-mult')) === mult) {
            btn.classList.add('active');
        }
    });
}

/* Face 1 Input Controls */
function inputFace1Number(num) {
    if (state.isFinished) return;
    const mult = state.multiplier;
    const points = num * mult;
    let label = `S${num}`;
    if (mult === 2) label = `D${num}`;
    if (mult === 3) label = `T${num}`;

    processThrow(1, label, points);
    setMultiplier(1);
}

function inputSpecial(label, points) {
    if (state.isFinished) return;
    processThrow(1, label, points);
    setMultiplier(1);
}

/* Face 2 Input Controls */
function inputFace2Zone(label, points) {
    if (state.isFinished) return;
    processThrow(2, label, points);
}

function submitCustomFace2() {
    const input = document.getElementById('customScoreInput');
    const val = parseInt(input.value);
    if (!isNaN(val) && val >= 0) {
        inputFace2Zone(`Custom (${val})`, val);
        input.value = '';
    }
}

/* Core Scoring Logic */
function processThrow(face, label, points) {
    if (state.currentTurnDarts.length >= 3) return;

    const player = state.players[state.activeIdx];
    const isCountdown = state.activeFace === 1 && state.gameMode !== 'COUNTUP';

    // Bust Check for Countdown Matches
    if (isCountdown) {
        const remaining = player.score - points;
        if (remaining < 0 || remaining === 1) {
            player.score = player.turnStartScore;
            state.history.unshift({
                playerName: player.name,
                playerIdx: state.activeIdx,
                face: face,
                label: `BUST (${label})`,
                points: 0,
                remaining: player.score
            });
            setTimeout(finishTurn, 300);
            updateUI();
            return;
        }
    }

    // Calculate Score
    if (isCountdown) {
        player.score -= points;
    } else {
        player.score += points;
    }

    player.totalDarts += 1;

    const entry = {
        playerName: player.name,
        playerIdx: state.activeIdx,
        face: face,
        label: label,
        points: points,
        remaining: player.score
    };

    state.currentTurnDarts.push(entry);
    state.history.unshift(entry);

    // Win Condition Check for Countdown Game
    if (isCountdown && player.score === 0) {
        triggerWinner(player);
        return;
    }

    // Automatically switch turn after 3 darts
    if (state.currentTurnDarts.length === 3) {
        setTimeout(finishTurn, 300);
    }

    updateUI();
}

/* Finish Turn / Next Player */
function finishTurn() {
    if (state.players.length === 0 || state.isFinished) return;
    
    const currentPlayer = state.players[state.activeIdx];
    state.currentTurnDarts = [];

    // Increment completed rounds after turn
    currentPlayer.currentRound += 1;

    // Check match end condition for Round-based games
    if (state.maxRounds > 0) {
        const allFinished = state.players.every(p => p.currentRound > state.maxRounds);
        if (allFinished) {
            evaluateRoundBasedWinner();
            return;
        }
    }

    // Move to next active player
    let nextIdx = (state.activeIdx + 1) % state.players.length;
    if (state.maxRounds > 0) {
        let checkCount = 0;
        while (state.players[nextIdx].currentRound > state.maxRounds && checkCount < state.players.length) {
            nextIdx = (nextIdx + 1) % state.players.length;
            checkCount++;
        }
    }

    state.activeIdx = nextIdx;
    const nextPlayer = state.players[state.activeIdx];
    nextPlayer.turnStartScore = nextPlayer.score;
    updateUI();
    resetTimer();
}

/* Determine Leaderboard Winner for Round Games */
function evaluateRoundBasedWinner() {
    state.isFinished = true;
    let winner = state.players[0];
    state.players.forEach(p => {
        if (p.score > winner.score) {
            winner = p;
        }
    });

    document.getElementById('winnerPlayerName').textContent = `${winner.name} Wins!`;
    const avg = winner.totalDarts > 0 ? ((winner.score / winner.totalDarts) * 3).toFixed(1) : 0;
    document.getElementById('winnerDetails').textContent = `Final Score: ${winner.score} Pts | Duration: ${state.maxRounds} Rounds | 3-Dart Avg: ${avg}`;
    openModal('winnerModal');
    pauseTimer();
}

/* Undo Whole Round Handler */
function undoLastDart() {
    // Case 1: Active player has thrown darts in the current turn
    if (state.currentTurnDarts.length > 0) {
        const player = state.players[state.activeIdx];
        
        // Revert player's score to before the turn started
        player.score = player.turnStartScore;
        
        // Decrement total darts by darts thrown this turn
        player.totalDarts -= state.currentTurnDarts.length;
        
        // Remove turn entries from history
        state.history.splice(0, state.currentTurnDarts.length);
        
        // Clear turn darts
        state.currentTurnDarts = [];
        updateUI();
        return;
    }

    // Case 2: Turn hasn't started yet, revert the previous player's entire last turn
    if (state.history.length > 0) {
        const lastEntry = state.history[0];
        const targetPlayerIdx = lastEntry.playerIdx;
        const targetPlayer = state.players[targetPlayerIdx];

        // Find how many darts were thrown by this player in their last turn
        let dartsToUndo = 0;
        for (let i = 0; i < state.history.length; i++) {
            if (state.history[i].playerIdx === targetPlayerIdx) {
                dartsToUndo++;
            } else {
                break;
            }
        }

        // Revert score and stats for that player
        targetPlayer.score = targetPlayer.turnStartScore;
        targetPlayer.totalDarts -= dartsToUndo;
        if (targetPlayer.currentRound > 1) {
            targetPlayer.currentRound -= 1;
        }

        // Remove the entire turn from history log
        state.history.splice(0, dartsToUndo);

        // Switch active index back to that player
        state.activeIdx = targetPlayerIdx;
        state.currentTurnDarts = [];

        updateUI();
        resetTimer();
    }
}

/* Trigger Winner Modal */
function triggerWinner(player) {
    state.isFinished = true;
    document.getElementById('winnerPlayerName').textContent = `${player.name} Wins!`;
    const avg = player.totalDarts > 0 ? ((player.startingScore / player.totalDarts) * 3).toFixed(1) : 0;
    document.getElementById('winnerDetails').textContent = `Total Darts Thrown: ${player.totalDarts} | 3-Dart Average: ${avg}`;
    openModal('winnerModal');
    pauseTimer();
}

// Global Timer Variables
let timerInterval = null;
let timeLeft = 30;
let isTimerRunning = false;

// Audio Context setup for synthetic beep sounds (no external audio files needed)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency = 440, duration = 0.15, type = 'sine') {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${timeLeft}s`;
        
        // Highlight display in red during final 5 seconds
        if (timeLeft <= 5 && timeLeft > 0) {
            display.style.color = '#ef4444';
        } else if (timeLeft === 0) {
            display.style.color = '#dc2626';
        } else {
            display.style.color = '#f59e0b';
        }
    }
}

function startTimer() {
    if (isTimerRunning) return;
    
    // Resume audio context on user interaction
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    isTimerRunning = true;
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();

            // Sound plays ONLY when 5, 4, 3, 2, 1 seconds remain
            if (timeLeft <= 5 && timeLeft > 0) {
                playBeep(600, 0.12, 'sine'); // Short warning beep
            } 
            // Final longer/higher pitch sound when timer reaches 0s
            else if (timeLeft === 0) {
                playBeep(900, 0.5, 'square'); // Buzzer sound for time ended
                clearInterval(timerInterval);
                isTimerRunning = false;
            }
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
}

function resetTimer() {
    pauseTimer();
    timeLeft = 30;
    updateTimerDisplay();
}

/* UI Renderer */
function updateUI() {
    if (state.players.length === 0) return;

    const activeP = state.players[state.activeIdx];
    const isCountdown = state.activeFace === 1 && state.gameMode !== 'COUNTUP';

    document.getElementById('gameModeBadge').textContent = 
        state.maxRounds > 0 ? `${state.maxRounds}-ROUND HIGH SCORE` :
        (state.gameMode === 'COUNTUP' ? 'COUNT-UP MODE' : `${state.gameMode} GAME`);

    document.getElementById('scoreLabel').textContent = 
        isCountdown ? 'REMAINING SCORE' : 'TOTAL CUMULATIVE SCORE';

    document.getElementById('activePlayerName').textContent = activeP.name;
    document.getElementById('activePlayerScore').textContent = activeP.score;

    // Round Info Badge
    const roundBadge = document.getElementById('roundInfoBadge');
    const roundOverviewLabel = document.getElementById('roundOverviewLabel');
    if (state.maxRounds > 0) {
        roundBadge.style.display = 'inline-block';
        const curR = Math.min(activeP.currentRound, state.maxRounds);
        roundBadge.textContent = `Round ${curR} / ${state.maxRounds}`;
        roundOverviewLabel.textContent = `Round ${curR} / ${state.maxRounds}`;
    } else {
        roundBadge.style.display = 'inline-block';
        roundBadge.textContent = `Round ${activeP.currentRound}`;
        roundOverviewLabel.textContent = `Round ${activeP.currentRound}`;
    }

    const turnPoints = state.currentTurnDarts.reduce((sum, d) => sum + d.points, 0);
    document.getElementById('currentTurnScore').textContent = turnPoints;

    let avg = 0;
    if (activeP.totalDarts > 0) {
        const scored = isCountdown ? (activeP.startingScore - activeP.score) : activeP.score;
        avg = ((scored / activeP.totalDarts) * 3).toFixed(1);
    }
    document.getElementById('activePlayerAvg').textContent = avg;

    // Dart Badge Indicators
    for (let i = 1; i <= 3; i++) {
        const b = document.getElementById(`dartBadge${i}`);
        if (i <= state.currentTurnDarts.length) {
            b.className = state.activeFace === 2 ? 'dart-badge filled-face2' : 'dart-badge filled';
            b.textContent = state.currentTurnDarts[i - 1].points;
        } else {
            b.className = 'dart-badge';
            b.textContent = i;
        }
    }

    // Render Leaderboard Overview
    const overview = document.getElementById('playersOverview');
    overview.innerHTML = '';
    state.players.forEach((p, idx) => {
        const active = idx === state.activeIdx;
        const row = document.createElement('div');
        
        let activeClass = '';
        if (active) {
            activeClass = state.activeFace === 2 ? 'active active-face2' : 'active';
        }
        
row.className = `player-row ${activeClass}`;
        const rText = state.maxRounds > 0 ? `(R${Math.min(p.currentRound, state.maxRounds)}/${state.maxRounds})` : `(R${p.currentRound})`;
        row.innerHTML = `
            <div style="font-weight:800; font-size:1.05rem;">${p.name} ${active ? '🎯' : ''} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">${rText}</span></div>
            <div style="font-weight:900; font-size:1.25rem; color:${active ? '#f59e0b' : 'white'};">${p.score}</div>
        `;
        overview.appendChild(row);
    });

    // Render History Table Log
    const historyBody = document.getElementById('historyTableBody');
    historyBody.innerHTML = '';
    state.history.forEach(h => {
        const tr = document.createElement('tr');
        const badgeColor = h.face === 1 ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
        tr.innerHTML = `
            <td style="font-weight:700; color:var(--text-main);">${h.playerName}</td>
            <td><span class="badge" style="background:${badgeColor}; color:white; border:none;">Face ${h.face}</span></td>
            <td style="color:#60a5fa; font-weight:700;">${h.label}</td>
            <td style="text-align:right; font-weight:800; color:#f59e0b;">+${h.points}</td>
            <td style="text-align:right; color:var(--text-muted); font-weight:600;">${h.remaining}</td>
        `;
        historyBody.appendChild(tr);
    });
}