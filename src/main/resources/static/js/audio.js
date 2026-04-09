// Audio Manager for Chinese Chess
const AudioManager = {
    context: null,
    bgMusicEnabled: true,
    sfxEnabled: true,
    bgMusicOscillators: [],
    bgMusicGain: null,
    masterGain: null,

    // Initialize audio context (must be called after user interaction)
    init() {
        if (this.context) return;
        this.context = new (window.AudioContext || window.webkitAudioContext)();

        // Master gain for volume control
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.context.destination);

        console.log('Audio context initialized');
    },

    // Play move sound - a satisfying click
    playMove() {
        if (!this.context) this.init();
        if (!this.sfxEnabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.1);

        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.1);
    },

    // Play select sound - higher pitch tap
    playSelect() {
        if (!this.context) this.init();
        if (!this.sfxEnabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.05);

        gain.gain.setValueAtTime(0.2, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.context.currentTime);
        osc.stop(this.context.currentTime + 0.08);
    },

    // Play check sound - warning tone
    playCheck() {
        if (!this.context) this.init();
        if (!this.sfxEnabled) return;

        const osc1 = this.context.createOscillator();
        const osc2 = this.context.createOscillator();
        const gain = this.context.createGain();

        osc1.type = 'square';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(440, this.context.currentTime);
        osc2.frequency.setValueAtTime(554, this.context.currentTime);

        gain.gain.setValueAtTime(0.15, this.context.currentTime);
        gain.gain.setValueAtTime(0.15, this.context.currentTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(this.context.currentTime);
        osc2.start(this.context.currentTime);
        osc1.stop(this.context.currentTime + 0.3);
        osc2.stop(this.context.currentTime + 0.3);
    },

    // Play game over sound (win or lose)
    playGameOver(isWin) {
        if (!this.context) this.init();
        if (!this.sfxEnabled) return;

        this.stopBackgroundMusic();

        const notes = isWin ? [523, 659, 784, 1047] : [392, 349, 330, 262];
        const duration = 0.2;

        notes.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.context.currentTime + i * duration);

            gain.gain.setValueAtTime(0, this.context.currentTime + i * duration);
            gain.gain.linearRampToValueAtTime(0.3, this.context.currentTime + i * duration + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + (i + 1) * duration);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(this.context.currentTime + i * duration);
            osc.stop(this.context.currentTime + (i + 1) * duration);
        });
    },

    // Start background music - ambient Chinese-style melody
    startBackgroundMusic() {
        if (!this.context) this.init();
        if (!this.bgMusicEnabled) return;
        if (this.bgMusicOscillators.length > 0) return; // Already playing

        this.bgMusicGain = this.context.createGain();
        this.bgMusicGain.gain.value = 0.08;
        this.bgMusicGain.connect(this.masterGain);

        // Create a simple pentatonic ambient sound
        const playNote = (freq, startTime, duration) => {
            const osc = this.context.createOscillator();
            const noteGain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            noteGain.gain.setValueAtTime(0, startTime);
            noteGain.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
            noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

            osc.connect(noteGain);
            noteGain.connect(this.bgMusicGain);

            osc.start(startTime);
            osc.stop(startTime + duration);

            this.bgMusicOscillators.push(osc);
        };

        // Pentatonic scale notes (C, D, E, G, A in Hz)
        const notes = [262, 294, 330, 392, 440, 523, 587, 659];
        let time = this.context.currentTime;

        const playMelody = () => {
            if (!this.bgMusicEnabled) return;

            const melody = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 7, 5, 4, 2, 0];
            melody.forEach((noteIndex, i) => {
                playNote(notes[noteIndex], time + i * 0.5, 0.6);
            });

            time += melody.length * 0.5;

            // Schedule next iteration
            setTimeout(() => {
                if (this.bgMusicEnabled && this.bgMusicOscillators.length > 0) {
                    this.bgMusicOscillators = [];
                    playMelody();
                }
            }, melody.length * 500);
        };

        playMelody();
        console.log('Background music started');
    },

    // Stop background music
    stopBackgroundMusic() {
        this.bgMusicOscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {
                // Already stopped
            }
        });
        this.bgMusicOscillators = [];
        console.log('Background music stopped');
    },

    // Toggle background music
    toggleBgMusic() {
        this.bgMusicEnabled = !this.bgMusicEnabled;
        if (this.bgMusicEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        return this.bgMusicEnabled;
    },

    // Toggle sound effects
    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    },

    // Set volume (0.0 to 1.0)
    setVolume(value) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, value));
        }
    },

    // Speak a message using Web Speech API
    speakMessage(text) {
        if (!this.sfxEnabled) return;

        // Check if browser supports speech synthesis
        if (!('speechSynthesis' in window)) {
            console.log('Speech synthesis not supported');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        // Try to find a Chinese voice
        const voices = window.speechSynthesis.getVoices();
        const chineseVoice = voices.find(voice => voice.lang.includes('zh'));
        if (chineseVoice) {
            utterance.voice = chineseVoice;
        }

        window.speechSynthesis.speak(utterance);
    }
};

// Export for use in other files
window.AudioManager = AudioManager;