(() => {
  "use strict";

  const PREF_KEY = "nightIdle.music.v1";
  const TRACK_BARS = 4;
  const STEPS_PER_BAR = 8;
  const TOTAL_STEPS = TRACK_BARS * STEPS_PER_BAR;

  const TRACKS = Object.freeze([
    Object.freeze({
      name: "Nuit Néon",
      bpm: 86,
      root: 45,
      pad: "sine",
      lead: "triangle",
      chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [10, 14, 17]],
      melody: [12,null,15,null,19,15,null,12, 10,null,12,15,null,19,17,null, 12,15,null,17,19,null,15,12, 10,null,14,17,null,15,12,null],
      pulse: [1,0,0,1,0,0,1,0]
    }),
    Object.freeze({
      name: "Pluie Pixel",
      bpm: 74,
      root: 48,
      pad: "triangle",
      lead: "sine",
      chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
      melody: [16,null,14,12,null,11,12,null, 9,null,12,14,16,null,14,null, 12,null,9,11,12,null,16,14, 12,null,11,null,9,7,null,null],
      pulse: [1,0,1,0,0,1,0,0]
    }),
    Object.freeze({
      name: "Orbite Douce",
      bpm: 92,
      root: 43,
      pad: "sine",
      lead: "sine",
      chords: [[0, 3, 7], [5, 8, 12], [7, 10, 14], [3, 7, 10]],
      melody: [12,15,null,19,null,22,19,null, 17,null,15,12,null,10,12,null, 15,null,17,19,22,null,19,17, 15,12,null,10,12,null,null,null],
      pulse: [1,0,0,0,1,0,0,1]
    }),
    Object.freeze({
      name: "Minuit Bleu",
      bpm: 80,
      root: 46,
      pad: "triangle",
      lead: "triangle",
      chords: [[0, 3, 7], [10, 14, 17], [8, 12, 15], [5, 8, 12]],
      melody: [12,null,10,null,15,null,17,null, 19,17,15,null,12,null,10,null, 8,null,12,15,null,17,15,12, 10,null,8,10,12,null,null,null],
      pulse: [1,0,1,0,1,0,0,0]
    }),
    Object.freeze({
      name: "Circuit Dormant",
      bpm: 98,
      root: 40,
      pad: "sawtooth",
      lead: "triangle",
      chords: [[0, 3, 7], [3, 7, 10], [8, 12, 15], [10, 14, 17]],
      melody: [12,null,15,12,19,null,15,null, 10,12,null,15,17,null,15,12, 19,null,22,19,17,null,15,null, 12,10,null,12,15,null,10,null],
      pulse: [1,0,1,0,1,0,1,0]
    }),
    Object.freeze({
      name: "Lune Statique",
      bpm: 68,
      root: 50,
      pad: "sine",
      lead: "sine",
      chords: [[0, 4, 7], [6, 11, 14], [9, 13, 16], [7, 11, 14]],
      melody: [19,null,null,16,null,14,null,11, 12,null,16,null,19,null,21,null, 23,null,21,19,null,16,null,14, 11,null,12,null,16,null,null,null],
      pulse: [1,0,0,0,0,1,0,0]
    }),
    Object.freeze({
      name: "Casino Vide",
      bpm: 96,
      root: 45,
      pad: "triangle",
      lead: "square",
      chords: [[0, 3, 7], [5, 9, 12], [7, 10, 14], [10, 14, 17]],
      melody: [12,15,19,null,17,15,12,null, 10,14,17,null,19,17,14,null, 15,19,22,null,19,17,15,null, 12,10,14,17,null,15,12,null],
      pulse: [1,0,1,1,0,1,0,1]
    }),
    Object.freeze({
      name: "Étoiles Binaires",
      bpm: 88,
      root: 47,
      pad: "sine",
      lead: "triangle",
      chords: [[0, 3, 7], [7, 10, 14], [5, 8, 12], [8, 12, 15]],
      melody: [12,null,19,null,15,null,22,null, 17,null,12,15,null,19,null,17, 15,12,null,10,null,15,17,null, 19,null,22,19,17,null,15,null],
      pulse: [1,0,0,1,0,1,0,0]
    }),
    Object.freeze({
      name: "Verre Violet",
      bpm: 82,
      root: 44,
      pad: "triangle",
      lead: "sine",
      chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
      melody: [16,null,19,21,null,19,16,null, 14,null,16,19,null,21,19,null, 16,14,null,12,14,null,16,19, 21,null,19,16,14,null,12,null],
      pulse: [1,0,1,0,0,0,1,0]
    }),
    Object.freeze({
      name: "Dernier Lancer",
      bpm: 104,
      root: 42,
      pad: "sawtooth",
      lead: "triangle",
      chords: [[0, 3, 7], [8, 12, 15], [10, 14, 17], [5, 8, 12]],
      melody: [12,15,null,19,22,null,19,17, 15,null,12,10,12,null,15,null, 17,19,22,null,24,null,22,19, 17,15,12,null,10,12,15,null],
      pulse: [1,1,0,1,0,1,1,0]
    })
  ]);

  function readPreferences() {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return { enabled: true, ...(parsed && typeof parsed === "object" ? parsed : {}) };
    } catch {
      return { enabled: true };
    }
  }

  let preferences = readPreferences();
  let context = null;
  let master = null;
  let activeSources = new Set();
  let nextTimer = null;
  let currentTrackIndex = -1;
  let generation = 0;
  let startedByGesture = false;

  function savePreferences() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
    } catch {
      // La préférence reste valable pour la session courante.
    }
  }

  function midiToFrequency(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function ensureAudio() {
    if (!preferences.enabled) return false;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      if (!context) {
        context = new AudioCtx();
        master = context.createGain();
        master.gain.value = 0.075;
        master.connect(context.destination);
      }
      if (context.state === "suspended") context.resume().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  function rememberSource(source) {
    activeSources.add(source);
    source.addEventListener("ended", () => activeSources.delete(source), { once: true });
  }

  function synthNote(note, start, duration, volume, wave = "sine", attack = 0.02, release = 0.08) {
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(midiToFrequency(note), start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(attack, duration * 0.25));
    gain.gain.setValueAtTime(Math.max(0.0002, volume), Math.max(start + attack, start + duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    rememberSource(oscillator);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function synthKick(start, volume = 0.018) {
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(92, start);
    oscillator.frequency.exponentialRampToValueAtTime(42, start + 0.13);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
    oscillator.connect(gain);
    gain.connect(master);
    rememberSource(oscillator);
    oscillator.start(start);
    oscillator.stop(start + 0.16);
  }

  function synthTick(start, volume = 0.004) {
    synthNote(92, start, 0.025, volume, "square", 0.003, 0.018);
  }

  function scheduleTrack(track, token) {
    if (!context || !master || token !== generation) return 0;

    const beat = 60 / track.bpm;
    const stepDuration = beat / 2;
    const barDuration = beat * 4;
    const totalDuration = barDuration * TRACK_BARS;
    const start = context.currentTime + 0.08;

    for (let bar = 0; bar < TRACK_BARS; bar += 1) {
      const chord = track.chords[bar % track.chords.length];
      const barStart = start + bar * barDuration;

      chord.forEach((offset, voiceIndex) => {
        synthNote(track.root + offset + 12, barStart, barDuration * 0.94, voiceIndex === 0 ? 0.014 : 0.009, track.pad, 0.18, 0.28);
      });

      for (let beatIndex = 0; beatIndex < 4; beatIndex += 1) {
        const chordRoot = chord[0];
        const bassOffset = beatIndex === 3 && bar % 2 === 1 ? chord[1] - 12 : chordRoot;
        synthNote(track.root + bassOffset - 12, barStart + beatIndex * beat, beat * 0.62, 0.017, "triangle", 0.012, 0.09);
      }
    }

    for (let step = 0; step < TOTAL_STEPS; step += 1) {
      const when = start + step * stepDuration;
      const melodyOffset = track.melody[step % track.melody.length];
      if (melodyOffset !== null && melodyOffset !== undefined) {
        synthNote(track.root + melodyOffset + 12, when, stepDuration * 0.68, 0.012, track.lead, 0.008, 0.07);
      }

      const pulse = track.pulse[step % track.pulse.length];
      if (pulse) synthTick(when + stepDuration * 0.48, 0.0035);
      if (step % STEPS_PER_BAR === 0 || step % STEPS_PER_BAR === 4) synthKick(when, 0.014);
    }

    return totalDuration;
  }

  function stopPlayback() {
    generation += 1;
    if (nextTimer !== null) {
      window.clearTimeout(nextTimer);
      nextTimer = null;
    }
    activeSources.forEach((source) => {
      try { source.stop(); } catch { /* déjà terminé */ }
    });
    activeSources.clear();
  }

  function chooseNextTrack() {
    if (TRACKS.length <= 1) return 0;
    let next = Math.floor(Math.random() * TRACKS.length);
    if (next === currentTrackIndex) next = (next + 1 + Math.floor(Math.random() * (TRACKS.length - 1))) % TRACKS.length;
    return next;
  }

  function playTrack(index) {
    if (!preferences.enabled || document.hidden || !ensureAudio() || !context || context.state !== "running") return;
    stopPlayback();
    generation += 1;
    const token = generation;
    currentTrackIndex = index;
    const track = TRACKS[index];
    const duration = scheduleTrack(track, token);
    renderMusicButton();

    if (duration > 0) {
      nextTimer = window.setTimeout(() => {
        if (token !== generation || !preferences.enabled || document.hidden) return;
        playTrack(chooseNextTrack());
      }, Math.max(250, duration * 1000 - 70));
    }
  }

  function startMusic() {
    if (!preferences.enabled || document.hidden || !startedByGesture) return;
    if (!ensureAudio()) return;
    if (activeSources.size > 0 || nextTimer !== null) return;
    playTrack(chooseNextTrack());
  }

  function handleFirstGesture() {
    startedByGesture = true;
    startMusic();
  }

  document.addEventListener("pointerdown", handleFirstGesture, { once: true, capture: true, passive: true });
  document.addEventListener("keydown", handleFirstGesture, { once: true, capture: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPlayback();
      return;
    }
    startMusic();
  });

  const footerButtons = document.querySelector(".footer-buttons");
  const resetButton = document.getElementById("resetButton");
  let musicButton = document.getElementById("musicButton");

  if (footerButtons && !musicButton) {
    musicButton = document.createElement("button");
    musicButton.id = "musicButton";
    musicButton.type = "button";
    musicButton.className = "prestige-button feel-toggle music-toggle";
    footerButtons.insertBefore(musicButton, resetButton || null);
  }

  function renderMusicButton() {
    if (!musicButton) return;
    musicButton.textContent = preferences.enabled ? "MUSIQUE ✓" : "MUSIQUE OFF";
    musicButton.classList.toggle("is-enabled", preferences.enabled);
    const trackName = currentTrackIndex >= 0 ? TRACKS[currentTrackIndex]?.name : null;
    musicButton.title = preferences.enabled && trackName ? `Musique : ${trackName}` : "Musique procédurale";
    musicButton.setAttribute("aria-label", preferences.enabled ? "Désactiver la musique" : "Activer la musique");
  }

  musicButton?.addEventListener("click", () => {
    preferences.enabled = !preferences.enabled;
    savePreferences();
    startedByGesture = true;

    if (!preferences.enabled) {
      stopPlayback();
    } else {
      startMusic();
    }
    renderMusicButton();
  });

  renderMusicButton();

  window.NightIdleMusic = Object.freeze({
    version: 1,
    trackCount: TRACKS.length,
    tracks: TRACKS.map((track) => track.name),
    enabled: () => preferences.enabled,
    currentTrack: () => currentTrackIndex >= 0 ? TRACKS[currentTrackIndex]?.name || null : null,
    next: () => {
      startedByGesture = true;
      if (preferences.enabled) playTrack(chooseNextTrack());
    }
  });
})();
