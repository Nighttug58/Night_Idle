(() => {
  "use strict";

  const PREF_KEY = "nightIdle.music.v1";
  const TRACK_BARS = 8;
  const STEPS_PER_BAR = 8;
  const TOTAL_STEPS = TRACK_BARS * STEPS_PER_BAR;

  const TRACKS = Object.freeze([
    Object.freeze({
      name: "Route Solaire",
      bpm: 152,
      root: 50,
      lead: "brass",
      counter: "pulse",
      chords: [[0,4,7],[5,9,12],[9,12,16],[7,11,14],[0,4,7],[5,9,12],[2,5,9],[7,11,14]],
      a: [12,14,16,null,19,16,14,12, 14,16,19,21,19,null,16,14],
      b: [16,19,21,23,21,19,16,null, 14,16,19,null,21,19,16,14],
      form: [["a",0],["a",0],["b",0],["a",12]],
      counterLine: [null,7,null,9,null,11,null,9, null,7,null,4,null,7,null,9],
      kick: [1,0,0,1,1,0,0,0],
      snare: [0,0,1,0,0,0,1,0],
      hats: [1,1,1,1,1,1,1,1]
    }),
    Object.freeze({
      name: "Forêt Veloce",
      bpm: 146,
      root: 45,
      lead: "pulse",
      counter: "bell",
      chords: [[0,3,7],[8,12,15],[3,7,10],[10,14,17],[0,3,7],[5,8,12],[8,12,15],[10,14,17]],
      a: [12,null,15,17,19,17,15,null, 12,15,19,null,22,19,17,15],
      b: [19,22,24,22,19,null,17,15, 17,19,22,null,24,22,19,null],
      form: [["a",0],["a",0],["b",0],["a",12]],
      counterLine: [7,null,10,null,12,null,10,null, 7,null,5,null,3,null,5,null],
      kick: [1,0,1,0,1,0,0,1],
      snare: [0,0,1,0,0,0,1,0],
      hats: [1,1,0,1,1,1,0,1]
    }),
    Object.freeze({
      name: "Port Azur",
      bpm: 158,
      root: 48,
      lead: "brass",
      counter: "bell",
      chords: [[0,4,7],[7,11,14],[9,12,16],[5,9,12],[0,4,7],[2,5,9],[5,9,12],[7,11,14]],
      a: [12,16,19,16,21,null,19,16, 14,16,19,23,21,19,16,null],
      b: [19,21,23,null,26,23,21,19, 16,19,21,null,23,21,19,16],
      form: [["a",0],["a",0],["b",0],["a",0]],
      counterLine: [null,7,null,11,null,9,null,7, null,5,null,9,null,7,null,11],
      kick: [1,0,0,1,1,0,1,0],
      snare: [0,0,1,0,0,0,1,0],
      hats: [1,1,1,1,1,1,1,1]
    }),
    Object.freeze({
      name: "Circuit d'Orage",
      bpm: 164,
      root: 47,
      lead: "pulse",
      counter: "brass",
      chords: [[0,4,7],[5,9,12],[7,11,14],[9,12,16],[5,9,12],[2,5,9],[7,11,14],[0,4,7]],
      a: [12,14,16,19,21,19,16,14, 16,null,19,21,23,21,19,null],
      b: [21,23,26,23,21,19,16,null, 19,21,23,null,28,23,21,19],
      form: [["a",0],["b",0],["a",0],["b",0]],
      counterLine: [7,null,9,null,11,null,9,null, 7,null,4,null,5,null,7,null],
      kick: [1,0,1,1,0,0,1,0],
      snare: [0,0,1,0,0,1,1,0],
      hats: [1,1,1,1,1,1,1,1]
    }),
    Object.freeze({
      name: "Ruines Mousses",
      bpm: 142,
      root: 43,
      lead: "bell",
      counter: "pulse",
      chords: [[0,3,7],[5,8,12],[8,12,15],[10,14,17],[0,3,7],[3,7,10],[5,8,12],[10,14,17]],
      a: [12,15,17,null,19,22,19,17, 15,null,17,19,22,null,19,15],
      b: [19,22,24,null,22,19,17,15, 17,19,22,24,22,null,19,17],
      form: [["a",0],["a",0],["b",0],["a",12]],
      counterLine: [7,null,8,null,10,null,8,null, 7,null,5,null,3,null,5,null],
      kick: [1,0,0,0,1,0,0,1],
      snare: [0,0,1,0,0,0,1,0],
      hats: [1,0,1,1,1,0,1,1]
    }),
    Object.freeze({
      name: "Duel Nocturne",
      bpm: 168,
      root: 46,
      lead: "brass",
      counter: "pulse",
      chords: [[0,3,7],[10,14,17],[8,12,15],[5,8,12],[0,3,7],[3,7,10],[10,14,17],[0,3,7]],
      a: [12,14,15,19,17,15,14,12, 15,17,19,22,20,19,17,null],
      b: [19,20,22,24,22,20,19,17, 15,17,19,null,22,19,17,15],
      form: [["a",0],["b",0],["a",12],["b",12]],
      counterLine: [7,null,10,null,8,null,7,null, 5,null,7,null,10,null,8,null],
      kick: [1,0,1,0,1,1,0,1],
      snare: [0,0,1,0,0,0,1,1],
      hats: [1,1,1,1,1,1,1,1]
    }),
    Object.freeze({
      name: "Montée Céleste",
      bpm: 150,
      root: 52,
      lead: "brass",
      counter: "bell",
      chords: [[0,4,7],[9,12,16],[5,9,12],[7,11,14],[0,4,7],[2,5,9],[5,9,12],[7,11,14]],
      a: [12,null,16,19,21,23,21,19, 16,19,21,null,23,21,19,16],
      b: [19,21,23,26,23,21,19,null, 16,19,21,23,28,23,21,null],
      form: [["a",0],["a",0],["b",0],["a",12]],
      counterLine: [7,null,9,null,11,null,9,null, 4,null,5,null,7,null,9,null],
      kick: [1,0,0,1,1,0,0,1],
      snare: [0,0,1,0,0,0,1,0],
      hats: [1,1,1,1,1,1,0,1]
    }),
    Object.freeze({
      name: "Atelier 8-Bit",
      bpm: 160,
      root: 44,
      lead: "pulse",
      counter: "bell",
      chords: [[0,3,7],[3,7,10],[8,12,15],[10,14,17],[0,3,7],[5,8,12],[3,7,10],[10,14,17]],
      a: [12,15,19,15,17,19,22,null, 19,17,15,12,15,17,19,null],
      b: [19,22,24,22,19,17,15,null, 17,19,22,null,24,22,19,17],
      form: [["a",0],["b",0],["a",0],["b",12]],
      counterLine: [7,null,10,null,12,null,10,null, 7,null,3,null,5,null,7,null],
      kick: [1,0,1,0,0,1,1,0],
      snare: [0,0,1,0,0,0,1,0],
      hats: [1,1,1,0,1,1,1,0]
    }),
    Object.freeze({
      name: "Pluie de Verre",
      bpm: 144,
      root: 49,
      lead: "bell",
      counter: "brass",
      chords: [[0,3,7],[8,12,15],[5,8,12],[10,14,17],[0,3,7],[3,7,10],[8,12,15],[10,14,17]],
      a: [12,14,15,null,19,17,15,14, 12,15,17,19,22,null,19,17],
      b: [19,22,24,null,22,19,17,15, 17,19,22,null,24,22,19,null],
      form: [["a",0],["a",0],["b",0],["a",12]],
      counterLine: [7,null,8,null,10,null,8,null, 5,null,7,null,3,null,5,null],
      kick: [1,0,0,1,1,0,0,0],
      snare: [0,0,1,0,0,0,1,0],
      hats: [1,1,0,1,1,1,0,1]
    }),
    Object.freeze({
      name: "Sommet Chromatique",
      bpm: 166,
      root: 42,
      lead: "brass",
      counter: "pulse",
      chords: [[0,4,7],[5,9,12],[7,11,14],[9,12,16],[2,6,9],[5,9,12],[7,11,14],[0,4,7]],
      a: [12,14,16,18,19,21,23,null, 21,19,16,14,16,19,21,null],
      b: [19,21,23,26,23,21,19,16, 18,19,21,23,28,26,23,null],
      form: [["a",0],["b",0],["a",12],["b",12]],
      counterLine: [7,null,9,null,11,null,9,null, 6,null,7,null,9,null,11,null],
      kick: [1,0,1,0,1,0,1,1],
      snare: [0,0,1,0,0,0,1,0],
      hats: [1,1,1,1,1,1,1,1]
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
  let compressor = null;
  let noiseBuffer = null;
  let activeSources = new Set();
  let nextTimer = null;
  let currentTrackIndex = -1;
  let generation = 0;
  let startedByGesture = false;

  function savePreferences() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(preferences));
    } catch {
      // Préférence conservée pour la session uniquement.
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
        compressor = context.createDynamicsCompressor();
        master.gain.value = 0.06;
        compressor.threshold.value = -18;
        compressor.knee.value = 10;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.18;
        master.connect(compressor);
        compressor.connect(context.destination);
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

  function synthVoice(note, start, duration, volume, wave = "triangle", attack = 0.006, release = 0.06, detune = 0) {
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(midiToFrequency(note), start);
    oscillator.detune.setValueAtTime(detune, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(attack, duration * 0.3));
    gain.gain.setValueAtTime(Math.max(0.0002, volume), Math.max(start + attack, start + duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    rememberSource(oscillator);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function synthBrass(note, start, duration, volume = 0.011) {
    if (!context || !master) return;
    const bus = context.createGain();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    filter.type = "lowpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(1200, start);
    filter.frequency.exponentialRampToValueAtTime(3200, start + Math.min(0.045, duration * 0.35));
    filter.frequency.exponentialRampToValueAtTime(1700, start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.018, duration * 0.25));
    envelope.gain.setValueAtTime(volume * 0.78, Math.max(start + 0.02, start + duration - 0.07));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    bus.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);

    [["sawtooth", -5, 0.58], ["square", 4, 0.42]].forEach(([wave, detune, level]) => {
      const oscillator = context.createOscillator();
      const mix = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(midiToFrequency(note), start);
      oscillator.detune.setValueAtTime(detune, start);
      mix.gain.value = level;
      oscillator.connect(mix);
      mix.connect(bus);
      rememberSource(oscillator);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.025);
    });
  }

  function synthPulse(note, start, duration, volume = 0.009) {
    synthVoice(note, start, duration, volume, "square", 0.004, 0.045);
    if (duration > 0.11) synthVoice(note + 12, start, duration * 0.62, volume * 0.18, "square", 0.003, 0.04);
  }

  function synthBell(note, start, duration, volume = 0.008) {
    synthVoice(note, start, duration, volume, "sine", 0.003, Math.min(0.12, duration * 0.5));
    synthVoice(note + 12, start, duration * 0.72, volume * 0.28, "triangle", 0.002, Math.min(0.09, duration * 0.45));
  }

  function synthPluck(note, start, duration, volume = 0.005) {
    synthVoice(note, start, duration, volume, "triangle", 0.002, Math.min(0.06, duration * 0.7));
  }

  function synthBass(note, start, duration, volume = 0.012) {
    synthVoice(note, start, duration, volume, "square", 0.004, 0.055);
    synthVoice(note - 12, start, duration, volume * 0.34, "triangle", 0.005, 0.06);
  }

  function synthStrings(note, start, duration, volume = 0.0045) {
    synthVoice(note, start, duration, volume, "sawtooth", 0.055, 0.14, -4);
    synthVoice(note + 12, start, duration, volume * 0.22, "triangle", 0.06, 0.16, 3);
  }

  function getNoiseBuffer() {
    if (!context) return null;
    if (noiseBuffer) return noiseBuffer;
    const length = Math.max(1, Math.floor(context.sampleRate * 0.35));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    noiseBuffer = buffer;
    return buffer;
  }

  function synthNoise(start, duration, volume, highpass = 3500) {
    if (!context || !master) return;
    const buffer = getNoiseBuffer();
    if (!buffer) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = highpass;
    gain.gain.setValueAtTime(Math.max(0.0002, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    rememberSource(source);
    source.start(start);
    source.stop(start + duration + 0.01);
  }

  function synthKick(start, volume = 0.022) {
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(118, start);
    oscillator.frequency.exponentialRampToValueAtTime(45, start + 0.11);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
    oscillator.connect(gain);
    gain.connect(master);
    rememberSource(oscillator);
    oscillator.start(start);
    oscillator.stop(start + 0.15);
  }

  function synthSnare(start, volume = 0.011) {
    synthNoise(start, 0.075, volume, 1700);
    synthVoice(55, start, 0.055, volume * 0.45, "triangle", 0.002, 0.045);
  }

  function synthHat(start, volume = 0.0032) {
    synthNoise(start, 0.028, volume, 6500);
  }

  function synthTom(start, note = 45, volume = 0.009) {
    synthVoice(note, start, 0.11, volume, "sine", 0.002, 0.09);
  }

  function playInstrument(kind, note, start, duration, volume) {
    if (kind === "brass") synthBrass(note, start, duration, volume);
    else if (kind === "bell") synthBell(note, start, duration, volume);
    else synthPulse(note, start, duration, volume);
  }

  function melodyAt(track, step) {
    const sectionIndex = Math.floor(step / 16);
    const inSection = step % 16;
    const descriptor = track.form[sectionIndex % track.form.length];
    const pattern = descriptor[0] === "b" ? track.b : track.a;
    const value = pattern[inSection];
    return value === null || value === undefined ? null : value + (Number(descriptor[1]) || 0);
  }

  function scheduleTrack(track, token) {
    if (!context || !master || token !== generation) return 0;

    const beat = 60 / track.bpm;
    const stepDuration = beat / 2;
    const barDuration = beat * 4;
    const totalDuration = barDuration * TRACK_BARS;
    const start = context.currentTime + 0.075;
    const arpOrder = [0,1,2,1,0,2,1,2];

    for (let bar = 0; bar < TRACK_BARS; bar += 1) {
      const chord = track.chords[bar % track.chords.length];
      const barStart = start + bar * barDuration;

      chord.forEach((offset, voiceIndex) => {
        synthStrings(track.root + offset + 12, barStart, barDuration * 0.94, voiceIndex === 0 ? 0.0045 : 0.0034);
      });

      for (let quarter = 0; quarter < 4; quarter += 1) {
        const bassOffset = quarter === 2 ? chord[2] - 12 : chord[0];
        synthBass(track.root + bassOffset - 12, barStart + quarter * beat, beat * 0.66, quarter === 0 ? 0.013 : 0.0105);
      }

      for (let localStep = 0; localStep < STEPS_PER_BAR; localStep += 1) {
        const when = barStart + localStep * stepDuration;
        const arpOffset = chord[arpOrder[localStep] % chord.length];
        synthPluck(track.root + arpOffset + 24, when + stepDuration * 0.08, stepDuration * 0.42, 0.0042);
      }
    }

    for (let step = 0; step < TOTAL_STEPS; step += 1) {
      const when = start + step * stepDuration;
      const localStep = step % STEPS_PER_BAR;
      const melodyOffset = melodyAt(track, step);

      if (melodyOffset !== null) {
        playInstrument(track.lead, track.root + melodyOffset + 12, when, stepDuration * 0.78, track.lead === "brass" ? 0.0105 : 0.0085);
      }

      const counterOffset = track.counterLine[step % track.counterLine.length];
      if (counterOffset !== null && counterOffset !== undefined && step % 2 === 1) {
        playInstrument(track.counter, track.root + counterOffset + 12, when + stepDuration * 0.12, stepDuration * 0.48, 0.0042);
      }

      if (track.kick[localStep]) synthKick(when, step % 16 === 0 ? 0.024 : 0.019);
      if (track.snare[localStep]) synthSnare(when, 0.0105);
      if (track.hats[localStep]) synthHat(when + stepDuration * 0.04, localStep % 2 === 0 ? 0.0034 : 0.0025);

      if (step >= TOTAL_STEPS - 4) {
        if (step === TOTAL_STEPS - 4) synthTom(when, 47, 0.008);
        if (step === TOTAL_STEPS - 2) synthTom(when, 50, 0.009);
        if (step === TOTAL_STEPS - 1) synthTom(when, 54, 0.010);
      }
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
      }, Math.max(250, duration * 1000 - 80));
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

    if (!preferences.enabled) stopPlayback();
    else startMusic();
    renderMusicButton();
  });

  renderMusicButton();

  window.NightIdleMusic = Object.freeze({
    version: 2,
    trackCount: TRACKS.length,
    tracks: TRACKS.map((track) => `${track.name} — ${track.bpm} BPM`),
    enabled: () => preferences.enabled,
    currentTrack: () => currentTrackIndex >= 0 ? TRACKS[currentTrackIndex]?.name || null : null,
    next: () => {
      startedByGesture = true;
      if (preferences.enabled) playTrack(chooseNextTrack());
    }
  });
})();