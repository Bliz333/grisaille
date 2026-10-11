'use strict';
/* GRISAILLE · audio — soft, synthesized sound design + quiet ambient electronic score (no square-wave chiptune) */
const AU = (() => {
  let ac = null, out, sfx, mus, musIn, musWet, echoIn, verbIn, lp, noiseB, brownB, on = true, vol = 0.8;
  const last = {};
  const can = (n, gap) => { const t = ac.currentTime; if (last[n] && t - last[n] < gap) return false; last[n] = t; return true; };
  const vr = (f, v = 0.05) => f * (1 + rand(-v, v));

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 14; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
    out = ac.createGain(); out.gain.value = on ? vol : 0;
    lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 19000; lp.Q.value = 0.4;
    sfx = ac.createGain(); sfx.gain.value = 0.85;
    mus = ac.createGain(); mus.gain.value = 0.48;
    const verb = ac.createConvolver(); verb.buffer = ir(2.6, 2.8);
    verbIn = ac.createGain(); const verbOut = ac.createGain(); verbOut.gain.value = 0.38;
    sfx.connect(lp); mus.connect(lp); verbIn.connect(verb); verb.connect(verbOut); verbOut.connect(lp);
    // music bus: soft top-end roll-off + gentle peak compressor, shared reverb send and a dark echo
    musIn = ac.createGain(); const mlp = ac.createBiquadFilter(), mc = ac.createDynamicsCompressor(); mlp.type = 'lowpass'; mlp.frequency.value = 9000; mlp.Q.value = 0.5;
    mc.threshold.value = -12; mc.knee.value = 10; mc.ratio.value = 2.5; mc.attack.value = 0.02; mc.release.value = 0.3; musIn.connect(mlp); mlp.connect(mc); mc.connect(mus);
    musWet = ac.createGain(); musWet.gain.value = 0.48; musWet.connect(verbIn);
    echoIn = ac.createGain(); const dly = ac.createDelay(1.5), fb = ac.createGain(), dlf = ac.createBiquadFilter(); dly.delayTime.value = 0.46; fb.gain.value = 0.34; dlf.type = 'lowpass'; dlf.frequency.value = 2400;
    echoIn.connect(dly); dly.connect(dlf); dlf.connect(fb); fb.connect(dly); dlf.connect(musIn);
    lp.connect(comp); comp.connect(out); out.connect(ac.destination);
    const n = ac.sampleRate * 2;
    noiseB = ac.createBuffer(1, n, ac.sampleRate); brownB = ac.createBuffer(1, n, ac.sampleRate);
    const a = noiseB.getChannelData(0), b = brownB.getChannelData(0); let l = 0;
    for (let i = 0; i < n; i++) { a[i] = Math.random() * 2 - 1; l = (l + 0.02 * a[i]) / 1.02; b[i] = l * 3.5; }
    Music.boot();
  }
  function ir(sec, decay) {
    const len = (ac.sampleRate * sec) | 0, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function send(g, amt) { if (amt) { const s = ac.createGain(); s.gain.value = amt; g.connect(s); s.connect(verbIn); } }
  // tone: sine/triangle voice with pitch glide
  function tone(type, f0, f1, dur, peak, o = {}) {
    const t = (o.at || ac.currentTime) + (o.delay || 0);
    const os = ac.createOscillator(); os.type = type;
    os.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) os.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur * (o.glide || 0.9));
    if (o.detune) os.detune.value = o.detune;
    const g = ac.createGain(); env(g, t, o.a || 0.004, dur, peak);
    let node = os;
    if (o.lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 0.7; os.connect(f); node = f; }
    node.connect(g); g.connect(o.bus || sfx); send(g, o.verb);
    os.start(t); os.stop(t + (o.a || 0.004) + dur + 0.05);
  }
  // noise: filtered white/brown noise burst with sweep
  function nz(dur, peak, o = {}) {
    const t = (o.at || ac.currentTime) + (o.delay || 0);
    const src = ac.createBufferSource(); src.buffer = o.brown ? brownB : noiseB; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q || 0.9;
    f.frequency.setValueAtTime(o.f || 1200, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    const g = ac.createGain(); env(g, t, o.a || 0.003, dur, peak);
    src.connect(f); f.connect(g); g.connect(o.bus || sfx); send(g, o.verb);
    src.start(t, Math.random() * 1.5); src.stop(t + (o.a || 0.003) + dur + 0.05);
  }
  const ok = () => ac && on;

  const S = {
    init, get ctx() { return ac; },
    toggle() { on = !on; if (out) out.gain.setTargetAtTime(on ? vol : 0, ac.currentTime, 0.05); return on; },
    get on() { return on; },
    setVol(v) { vol = v; if (out && on) out.gain.setTargetAtTime(vol, ac.currentTime, 0.05); },
    get vol() { return vol; },
    get bio() { return Music.bio; },
    muffle(d = 0.6, f = 420) { if (!ac) return; const t = ac.currentTime; lp.frequency.cancelScheduledValues(t); lp.frequency.setValueAtTime(f, t); lp.frequency.exponentialRampToValueAtTime(19000, t + d); },
    tone, nz,

    shot(p = 1) { if (!ok() || !can('shot', 0.035)) return; nz(0.06, 0.16, { f: vr(2400 * p), f2: 700, q: 1.2 }); tone('sine', vr(190 * p), 55, 0.08, 0.32); tone('triangle', vr(900 * p), 300, 0.04, 0.05); },
    needle() { if (!ok() || !can('needle', 0.05)) return; nz(0.03, 0.08, { f: vr(3800), f2: 1500, q: 1.6 }); tone('sine', vr(320), 140, 0.035, 0.12); },
    shotgun() { if (!ok()) return; nz(0.2, 0.34, { f: 3200, f2: 380, type: 'lowpass', q: 0.7, verb: 0.25 }); tone('sine', 130, 38, 0.18, 0.55); nz(0.05, 0.12, { f: 6000, type: 'highpass', delay: 0.22 }); tone('triangle', 520, 480, 0.04, 0.05, { delay: 0.3 }); },
    swing(p = 1) { if (!ok() || !can('swing', 0.05)) return; nz(0.15, 0.16, { f: 500 * p, f2: 2600 * p, q: 1.4, a: 0.02 }); },
    slash() { if (!ok() || !can('slash', 0.04)) return; tone('sine', vr(1900), 1300, 0.12, 0.05); tone('sine', vr(1900 * 2.76), 2400, 0.08, 0.025); },
    hit(heavy) { if (!ok() || !can('hit', 0.028)) return; tone('sine', vr(260), 85, heavy ? 0.14 : 0.08, heavy ? 0.4 : 0.26); nz(0.035, 0.14, { f: vr(1600), type: 'lowpass' }); },
    crit() { if (!ok() || !can('crit', 0.05)) return; tone('sine', vr(240), 70, 0.12, 0.34); tone('sine', vr(2600), 1900, 0.16, 0.07, { verb: 0.4 }); tone('sine', vr(3900), 3000, 0.1, 0.03); },
    kill(big) { if (!ok() || !can('kill', 0.035)) return; tone('sine', vr(150), 38, big ? 0.35 : 0.2, big ? 0.6 : 0.42); nz(0.14, 0.2, { f: vr(900), f2: 300, q: 0.8, verb: 0.2 }); tone('sine', vr(620), 1240, 0.05, 0.05, { delay: 0.01 }); },
    boom(sz = 1) { if (!ok() || !can('boom', 0.06)) return; nz(0.55 * sz, 0.55, { brown: true, type: 'lowpass', f: 1400, f2: 110, q: 0.6, verb: 0.35 }); tone('sine', 82, 26, 0.5 * sz, 0.7); nz(0.08, 0.22, { f: 2200, f2: 500 }); },
    pop() { if (!ok() || !can('pop', 0.04)) return; tone('sine', vr(420), 160, 0.07, 0.2); nz(0.05, 0.1, { f: 1100 }); },
    dash() { if (!ok()) return; nz(0.2, 0.17, { f: 380, f2: 2100, q: 1.1, a: 0.03 }); tone('sine', 300, 520, 0.12, 0.04); },
    hurt() { if (!ok()) return; tone('sine', 210, 48, 0.4, 0.7); nz(0.28, 0.32, { brown: true, type: 'lowpass', f: 900, f2: 120 }); S.muffle(0.9, 360); },
    shieldBreak() { if (!ok()) return; nz(0.2, 0.18, { f: 4200, f2: 1800, q: 2, verb: 0.4 }); tone('sine', 1500, 700, 0.25, 0.08, { verb: 0.4 }); tone('sine', 180, 60, 0.2, 0.3); S.muffle(0.4, 900); },
    shieldUp() { if (!ok()) return; tone('sine', 880, 1320, 0.12, 0.04, { verb: 0.3 }); },
    coin(i = 0) { if (!ok() || !can('coin', 0.03)) return; const sc = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; const f = 880 * Math.pow(2, sc[Math.min(i, sc.length - 1)] / 12); tone('sine', f, f, 0.3, 0.06, { verb: 0.3 }); tone('sine', f * 2.01, f * 2, 0.12, 0.02); },
    soul() { if (!ok() || !can('soul', 0.05)) return; tone('sine', vr(1400, 0.1), 2100, 0.1, 0.025, { verb: 0.5 }); },
    pickup() { if (!ok()) return; [0, 4, 7, 12].forEach((s, i) => tone('sine', 523 * Math.pow(2, s / 12), 0, 0.5, 0.07, { delay: i * 0.05, verb: 0.5 })); },
    select() { if (!ok()) return; [0, 4, 7, 11, 14].forEach((s, i) => { tone('sine', 392 * Math.pow(2, s / 12), 0, 1.4, 0.06, { delay: i * 0.03, a: 0.01, verb: 0.6 }); tone('triangle', 196 * Math.pow(2, s / 12), 0, 1.0, 0.025, { delay: i * 0.03, a: 0.02 }); }); },
    uiHover() { if (!ok() || !can('uih', 0.04)) return; tone('sine', 1400, 1500, 0.04, 0.025); },
    uiClick() { if (!ok()) return; tone('sine', 660, 990, 0.07, 0.07); },
    deny() { if (!ok()) return; tone('sine', 220, 180, 0.15, 0.12); tone('sine', 233, 190, 0.15, 0.08); },
    door() { if (!ok()) return; nz(0.7, 0.22, { brown: true, type: 'lowpass', f: 320, f2: 120 }); [0, 7, 12].forEach((s, i) => tone('sine', 330 * Math.pow(2, s / 12), 0, 0.9, 0.04, { delay: 0.15 + i * 0.08, verb: 0.6 })); },
    clear() { if (!ok()) return; tone('sine', 110, 40, 0.4, 0.55); nz(0.12, 0.2, { brown: true, type: 'lowpass', f: 700 }); [0, 4, 7, 12, 16].forEach((s, i) => tone('sine', 523 * Math.pow(2, s / 12), 0, 1.1, 0.045, { delay: 0.1 + i * 0.06, verb: 0.6 })); },
    spawn() { if (!ok() || !can('spawn', 0.12)) return; nz(0.5, 0.05, { f: 300, f2: 1800, q: 2, a: 0.4 }); },
    eshot() { if (!ok() || !can('eshot', 0.045)) return; tone('sine', vr(560), 280, 0.09, 0.06); nz(0.04, 0.04, { f: 1400 }); },
    tele() { if (!ok() || !can('tele', 0.1)) return; tone('sine', 300, 600, 0.35, 0.05, { a: 0.2 }); tone('sine', 303, 606, 0.35, 0.04, { a: 0.2 }); },
    charge(k) { if (!ok() || !can('chg', 0.07)) return; tone('sine', 300 + k * 700, 0, 0.06, 0.03); },
    charged() { if (!ok()) return; tone('sine', 1320, 0, 0.25, 0.07, { verb: 0.5 }); tone('sine', 1980, 0, 0.18, 0.03); },
    rail(k) { if (!ok()) return; nz(0.25, 0.3, { f: 5000, f2: 600, type: 'lowpass', verb: 0.4 }); tone('sine', 1200, 90, 0.3, 0.3); tone('sawtooth', 160, 60, 0.3, 0.12 * k, { lp: 900 }); },
    slam(k) { if (!ok()) return; tone('sine', 90, 24, 0.5, 0.8); nz(0.45, 0.45 + 0.2 * k, { brown: true, type: 'lowpass', f: 1600, f2: 90, verb: 0.4 }); nz(0.1, 0.2, { f: 800, f2: 200 }); },
    bow(k) { if (!ok()) return; tone('triangle', 260 + 200 * k, 90, 0.12, 0.18); nz(0.08, 0.14, { f: 3000, f2: 900 }); },
    throwS() { if (!ok() || !can('thr', 0.05)) return; nz(0.16, 0.12, { f: 1200, f2: 2600, q: 3 }); },
    lob() { if (!ok()) return; tone('sine', 220, 120, 0.12, 0.3); nz(0.1, 0.12, { f: 700, type: 'lowpass' }); },
    reflect() { if (!ok() || !can('refl', 0.04)) return; tone('sine', vr(2200), 2600, 0.12, 0.06, { verb: 0.4 }); tone('sine', vr(3300), 3600, 0.08, 0.025); },
    tink() { if (!ok() || !can('tink', 0.05)) return; tone('sine', vr(1700), 1500, 0.06, 0.05); },
    crate() { if (!ok() || !can('crate', 0.05)) return; tone('triangle', vr(190), 110, 0.08, 0.2); nz(0.12, 0.2, { f: 700, f2: 350, q: 1.4 }); },
    zap() { if (!ok() || !can('zap', 0.07)) return; nz(0.12, 0.08, { f: 5200, f2: 2600, q: 3 }); tone('sine', 1800, 900, 0.08, 0.035); },
    burn() { if (!ok() || !can('burn', 0.18)) return; nz(0.2, 0.05, { f: 900, f2: 1600, q: 0.8 }); },
    freeze() { if (!ok() || !can('frz', 0.1)) return; tone('sine', 2400, 3100, 0.2, 0.05, { verb: 0.5 }); nz(0.15, 0.08, { f: 6000, q: 2 }); },
    swap() { if (!ok()) return; nz(0.06, 0.08, { f: 2600, q: 2 }); tone('sine', 700, 500, 0.05, 0.05, { delay: 0.04 }); },
    heal() { if (!ok()) return; [0, 5, 9, 12].forEach((s, i) => tone('sine', 440 * Math.pow(2, s / 12), 0, 0.6, 0.06, { delay: i * 0.07, verb: 0.6 })); },
    chroma() { if (!ok()) return; nz(0.9, 0.2, { f: 200, f2: 6000, q: 1.5, a: 0.5 }); [0, 7, 12, 16, 19, 24].forEach((s, i) => { tone('sine', 220 * Math.pow(2, s / 12), 0, 2.2, 0.06, { delay: 0.45 + i * 0.03, a: 0.02, verb: 0.8 }); tone('triangle', 110 * Math.pow(2, s / 12), 0, 1.8, 0.03, { delay: 0.45, a: 0.05 }); }); tone('sine', 60, 28, 1.0, 0.7, { delay: 0.45 }); },
    synergy() { if (!ok()) return; [0, 4, 7, 11, 14, 19].forEach((s, i) => tone('sine', 523 * Math.pow(2, s / 12), 0, 1.6, 0.05, { delay: i * 0.07, verb: 0.8 })); },
    roar(p = 1) { if (!ok()) return; tone('sawtooth', 55 * p, 40 * p, 1.4, 0.22, { lp: 420, a: 0.15 }); tone('sawtooth', 58 * p, 41 * p, 1.4, 0.18, { lp: 380, a: 0.2 }); nz(1.2, 0.26, { brown: true, type: 'lowpass', f: 300, f2: 900, a: 0.3, verb: 0.5 }); S.muffle(1.2, 900); },
    laser(d = 1) { if (!ok()) return; tone('sawtooth', 110, 105, d, 0.12, { lp: 1100, a: 0.05 }); tone('sine', 440, 430, d, 0.06, { a: 0.05 }); nz(d, 0.07, { f: 2400, q: 0.8, a: 0.05 }); },
    phase() { if (!ok()) return; S.boom(1.4); nz(1.1, 0.16, { f: 8000, type: 'highpass', a: 0.9 }); [0, 3, 7, 10].forEach((s, i) => tone('sine', 196 * Math.pow(2, s / 12), 0, 2, 0.05, { delay: 0.9 + i * 0.05, verb: 0.8 })); },
    stamp() { if (!ok()) return; tone('sine', 95, 40, 0.3, 0.6); nz(0.08, 0.3, { brown: true, type: 'lowpass', f: 1100 }); },
    heart() { if (!ok()) return; tone('sine', 62, 40, 0.18, 0.5); tone('sine', 58, 38, 0.16, 0.35, { delay: 0.2 }); },
    portal() { if (!ok()) return; nz(1.4, 0.12, { f: 200, f2: 4000, q: 2, a: 0.8, verb: 0.6 }); [0, 7, 14, 19].forEach((s, i) => tone('sine', 262 * Math.pow(2, s / 12), 0, 2, 0.05, { delay: 0.6 + i * 0.1, verb: 0.8 })); },
    page() { if (!ok() || !can('page', 0.08)) return; tone('sine', 1180, 1320, 0.09, 0.03, { verb: 0.3 }); tone('sine', 1770, 1980, 0.06, 0.01, { delay: 0.03 }); },
    chest() { if (!ok()) return; tone('triangle', 180, 120, 0.12, 0.25); nz(0.18, 0.12, { f: 600, f2: 300, q: 1.2 }); [0, 4, 7, 12, 16].forEach((s, i) => tone('sine', 587 * Math.pow(2, s / 12), 0, 0.8, 0.05, { delay: 0.12 + i * 0.05, verb: 0.6 })); },
    altar() { if (!ok()) return; tone('sine', 98, 49, 1.2, 0.4, { verb: 0.6 }); [0, 3, 7, 10].forEach((s, i) => tone('sine', 294 * Math.pow(2, s / 12), 0, 1.6, 0.05, { delay: 0.2 + i * 0.1, a: 0.05, verb: 0.8 })); },
    frag() { if (!ok()) return; S.chroma(); },
    gate() { if (!ok() || !can('gate', 0.2)) return; tone('sine', 70, 45, 0.35, 0.45); nz(0.3, 0.2, { brown: true, type: 'lowpass', f: 500, f2: 120 }); tone('triangle', 400, 300, 0.06, 0.06, { delay: 0.05 }); },
    foe() { if (!ok()) return; tone('sine', 220, 0, 0.5, 0.08, { verb: 0.5 }); tone('sine', 233, 0, 0.5, 0.06, { delay: 0.12, verb: 0.5 }); },
    step() { if (!ok() || !can('step', 0.12)) return; nz(0.03, 0.025, { f: 600, type: 'lowpass' }); },
    splash() { if (!ok() || !can('splash', 0.2)) return; nz(0.12, 0.06, { f: 900, f2: 400, q: 0.8 }); },
  };

  /* ---------- score: quiet ambient electronics — detuned pad, sub drone, sparse glass plinks, air; fights add only a soft low pulse ---------- */
  // scales and chords in semitones over the tonic; a chord is three pad voices (the sub drone holds the tonic underneath)
  const SC = { dor: [0, 2, 3, 5, 7, 9, 10], aeo: [0, 2, 3, 5, 7, 8, 10], phr: [0, 1, 3, 5, 7, 8, 10], maj: [0, 2, 4, 5, 7, 9, 11] };
  const CH = { i: [3, 7, 14], iv: [5, 8, 12], IV: [5, 9, 12], v: [7, 10, 14], III: [3, 7, 10], VI: [8, 12, 19], VII: [10, 14, 17], bII: [1, 5, 8],
    I: [4, 7, 14], IVM: [5, 9, 16], vi: [9, 12, 16], V: [7, 11, 14], Vs: [7, 12, 14] };
  // levels: Crypt cold stone + air · Sewers low-passed + drips · Clockworks faint ticking · Void sparse, wide, drifting. Progressions: one chord per 2 bars.
  // mo = the level's plink motif [scale degree, beat]; fm = glass plink modulator ratio (0 = pure sine)
  const LVL = [
    { k: 50, sc: 'dor', bpm: [66, 84, 78], wave: 'sawtooth', cut: 900, wide: 0.35, drift: 4, fm: 2, ctr: 60, mo: [[4, 0], [2, 1], [0, 2.5]],
      calm: ['i IV i VII', 'i VII III IV', 'i v IV i'], fight: ['i VII i IV', 'i v VII i'], boss: ['i bII i VII', 'i VI bII i'] },
    { k: 48, sc: 'aeo', bpm: [60, 80, 74], wave: 'triangle', cut: 480, wide: 0.2, drift: 4, fm: 1, ctr: 55, mo: [[0, 0], [2, 1.5], [1, 2]],
      calm: ['i VI i VII', 'i iv VI v', 'i VII VI iv'], fight: ['i VI VII i', 'i iv VI VII'], boss: ['i bII VI i', 'i iv bII i'] },
    { k: 52, sc: 'phr', bpm: [72, 92, 84], wave: 'sawtooth', cut: 1300, wide: 0.3, drift: 3, fm: 3, ctr: 62, mo: [[4, 0], [5, 0.5], [4, 1], [0, 2]],
      calm: ['i bII i VII', 'i bII III iv', 'i iv bII i'], fight: ['i bII i VII', 'i III bII i'], boss: ['i bII i bII', 'i iv bII VII'] },
    { k: 47, sc: 'phr', bpm: [54, 76, 70], wave: 'triangle', cut: 700, wide: 0.8, drift: 14, fm: 1.414, ctr: 59, mo: [[0, 0], [1, 2], [6, 3]],
      calm: ['i bII i iv', 'i VI bII i'], fight: ['i bII VI i', 'i iv bII i'], boss: ['i bII VI bII', 'i bII i bII'] },
  ];
  const MENU = { k: 45, sc: 'aeo', bpm: [60], wave: 'triangle', cut: 750, wide: 0.45, drift: 6, fm: 0, ctr: 57, mo: [[4, 0], [2, 1], [3, 2]], calm: ['i VI III VII', 'i iv VI i'] };
  const WIN = { k: 43, sc: 'maj', bpm: [66], wave: 'sawtooth', cut: 1500, wide: 0.45, drift: 4, fm: 2, ctr: 64, mo: [[4, 0], [2, 1], [0, 2]], calm: ['I IVM vi IVM', 'IVM I Vs I'] };
  // bus: [level, reverb, echo, pan]
  const MIX = { pad: [0.013, 0.45, 0, 0], sub: [0.013, 0, 0, 0], pl: [0.056, 0.8, 0.35, 0.2], dr: [0.084, 0.08, 0, 0], tk: [0.054, 0.3, 0.1, -0.3], sw: [0.12, 0.6, 0, 0], dp: [0.044, 0.5, 0.4, 0.35] };
  const FADE = { menu: [1.2, 1.6], calm: [1, 1.4], combat: [0.6, 0.35], boss: [0.5, 0.3], dead: [0.4, 0.15], win: [0.8, 1], off: [0.6] };
  const LV = { menu: 0.8, calm: 1, combat: 1, boss: 1, dead: 1, win: 1 }, CUT = { menu: 0.9, calm: 1, combat: 1.25, boss: 0.85, dead: 0.6, win: 1 }, BIOM = { calm: 1, combat: 1, boss: 1 };
  const PERM = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const hz = n => 440 * Math.pow(2, (n - 69) / 12), near = (n, c) => n + 12 * Math.round((c - n) / 12), sd = (sc, d) => sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const mkR = a => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const mt = (ty, a, b, d, p, o) => { if (o.at >= ac.currentTime) tone(ty, a, b, d, p, o); }, mn = (d, p, o) => { if (o.at >= ac.currentTime) nz(d, p, o); };
  const phase = () => G.boss && G.boss.hp < G.boss.maxHp * 0.5 ? 2 : 1;
  // glass plink: sine carrier with a fast-decaying FM modulator (bright attack, pure tail), long reverb + echo on its bus
  function plink(s, n, t, v, d = 2.8) {
    if (t < ac.currentTime) return;
    const f = hz(n), r = s.B.fm, c = ac.createOscillator(), g = ac.createGain();
    c.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    c.connect(g); g.connect(s.bus('pl')); c.start(t); c.stop(t + d + 0.05);
    if (r) { const m = ac.createOscillator(), mg = ac.createGain(); m.frequency.value = f * r; mg.gain.setValueAtTime(f * 1.5, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 0.45); m.connect(mg); mg.connect(c.frequency); m.start(t); m.stop(t + d); }
  }
  const kick = (s, t, v, f = 50, d = 0.42) => mt('sine', f * 2.1, f, d, v, { at: t, bus: s.bus('dr'), glide: 0.16, a: 0.006 });
  const tick = (s, t, v, f = 6500) => mn(0.03, v, { at: t, bus: s.bus('tk'), f, q: 1.2, a: 0.002 });
  const drip = (s, n, t, v) => mt('sine', hz(n), hz(n) * 1.6, 0.07, v, { at: t, bus: s.bus('dp'), a: 0.003, glide: 0.5 });
  const swell = (s, t, d, v, f, f2) => mn(d * 0.45, v, { at: t, bus: s.bus('sw'), f, f2, q: 1.4, a: d * 0.55 });
  // a plink on a chord tone an octave up, or on a scale tone two octaves over the tonic
  const rp = s => s.R() < 0.6 ? s.vc[(s.R() * 3) | 0] + 12 : s.k + 24 + sd(s.sc, (s.R() * 7) | 0);
  const motif = (s, t, base, v, d, tr = s.P.mt) => { for (const [dd, b] of s.B.mo) plink(s, base + sd(s.sc, dd + tr), t + b * 4 * s.st, v, d); };
  function mkBus(s, k) {
    const [l, rv, ec, pn] = MIX[k], g = ac.createGain(), p = ac.createStereoPanner(); g.gain.value = l; p.pan.value = pn; g.connect(p); p.connect(s.dry);
    if (rv) { const w = ac.createGain(); w.gain.value = rv; p.connect(w); w.connect(s.wet); }
    if (ec) { const e = ac.createGain(); e.gain.value = ec; p.connect(e); e.connect(s.ech); }
    return g;
  }
  // a song = one mode in one key: its own fade gains (dry / reverb / echo), a voice-led 3-voice pad (2 detuned oscillators each, spread L/R), sub drone, seeded RNG, bar clock
  function mkSong(m, bi, now, tin, p0 = 0) {
    const B = m === 'menu' ? MENU : m === 'win' ? WIN : LVL[bi], R = mkR((Math.random() * 4294967296) >>> 0), bpm = B.bpm[m === 'combat' ? 1 : m === 'boss' ? 2 : 0], ctr = B.ctr - (m === 'dead' ? 7 : 0);
    const s = { m, B, bi, R, k: B.k, sc: SC[B.sc], ctr, st: 15 / bpm, bar: p0 * 8, next: now + 0.1, buses: {}, src: [], P: {}, lc: null, vc: [ctr - 5, ctr, ctr + 5],
      prog: (m === 'combat' ? B.fight : m === 'boss' ? B.boss : B.calm)[0].split(' ') };
    s.bl = 16 * s.st; s.dry = ac.createGain(); s.wet = ac.createGain(); s.ech = ac.createGain();
    for (const g of [s.dry, s.wet, s.ech]) { g.gain.value = 0; g.gain.setTargetAtTime(LV[m], now, tin); }
    s.dry.connect(musIn); s.wet.connect(musWet); s.ech.connect(echoIn);
    s.bus = k => s.buses[k] || (s.buses[k] = mkBus(s, k));
    const pf = ac.createBiquadFilter(), pg = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), dl = ac.createOscillator(), dgn = ac.createGain(), pL = ac.createStereoPanner(), pR = ac.createStereoPanner(), keep = o => { o.start(now); s.src.push([o, Infinity]); };
    pf.type = 'lowpass'; pf.frequency.value = B.cut * CUT[m]; pf.Q.value = 0.8; lfo.frequency.value = 0.03 + R() * 0.03; lg.gain.value = B.cut * CUT[m] * 0.35; dl.frequency.value = 0.05 + R() * 0.04; dgn.gain.value = B.drift;
    pL.pan.value = -B.wide; pR.pan.value = B.wide; lfo.connect(lg); lg.connect(pf.frequency); dl.connect(dgn); pL.connect(pf); pR.connect(pf); pf.connect(pg); pg.connect(s.bus('pad')); keep(lfo); keep(dl);
    s.pv = []; for (let i = 0; i < 6; i++) { const o = ac.createOscillator(); o.type = i % 2 ? 'triangle' : B.wave; o.detune.value = i % 2 ? 7 : -7; o.frequency.value = hz(s.vc[i >> 1]); o.connect(i % 2 ? pR : pL); dgn.connect(o.detune); keep(o); s.pv.push(o); }
    for (const [n, a, ty] of [[s.k - 12, 1, 'sine'], [s.k, 0.22, 'triangle']]) { const o = ac.createOscillator(), g = ac.createGain(); o.type = ty; o.frequency.value = hz(n); g.gain.value = a; o.connect(g); g.connect(s.bus('sub')); keep(o); }
    // voice-led chord change: try every voice assignment, keep voices within ±10 of the centre, avoid semitone clusters
    s.chord = (x, t) => {
      const c = CH[x]; let best = s.vc, bc = 1e9;
      for (const p of PERM) {
        const v = p.map((j, i) => { let n = near(s.k + c[j], s.vc[i]); if (n > ctr + 10) n -= 12; if (n < ctr - 10) n += 12; return n; }), so = [...v].sort((a, b) => a - b);
        const cost = v.reduce((a, n, i) => a + Math.abs(n - s.vc[i]), 0) + (so[1] - so[0] < 2 || so[2] - so[1] < 2 ? 8 : 0); if (cost < bc) { bc = cost; best = v; }
      }
      s.vc = best; best.forEach((n, i) => { for (const o of [s.pv[i * 2], s.pv[i * 2 + 1]]) o.frequency.setTargetAtTime(hz(n), t, 0.05); });
      pg.gain.setTargetAtTime(0.65, Math.max(ac.currentTime, t - 0.15), 0.08); pg.gain.setTargetAtTime(1, t + 0.1, 1.2);
    };
    s.duck = t => { if (t < ac.currentTime) return; pg.gain.setTargetAtTime(0.6, t, 0.02); pg.gain.setTargetAtTime(1, t + 0.08, 0.35); };
    s.pf = pf;
    s.heart = t => { if (G.lowHp) for (const k of [0, 8]) { kick(s, t + k * s.st, 0.5, 48, 0.3); kick(s, t + k * s.st + 0.18, 0.32, 44, 0.25); } };
    s.kill = (t, tau) => { for (const g of [s.dry, s.wet, s.ech]) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0, t, tau); } const e = t + tau * 9; for (const [x, st] of s.src) if (st > e) x.stop(e); setTimeout(() => { for (const g of [s.dry, s.wet, s.ech]) g.disconnect(); }, (tau * 9 + 0.3) * 1000); };
    return s;
  }
  // per 8-bar period: progression, and whether / where / how transposed the level motif appears
  function period(s, p) {
    const L = s.m === 'combat' ? s.B.fight : s.m === 'boss' ? s.B.boss : s.B.calm, R = s.R;
    s.prog = (p ? L[(R() * L.length) | 0] : L[0]).split(' '); s.src = s.src.filter(x => x[1] > ac.currentTime);
    s.P = { mb: R() < 0.5 ? 2 : 5, mt: [0, 0, 2, -2][(R() * 4) | 0], mo: R() < 0.6 };
  }
  const PLAY = {
    menu(s, bar, t) {
      const pb = bar % 8, R = s.R; if (!pb) period(s, bar / 8 | 0);
      if (!(pb % 2)) s.chord(s.prog[pb >> 1], t);
      if (R() < 0.2) plink(s, rp(s), t + s.st * ((R() * 16) | 0), 0.45, 3.2);
      if (pb === s.P.mb && s.P.mo && bar >= 8) motif(s, t, s.k + 24, 0.4, 3.2);
      if (pb === 4 && R() < 0.35) swell(s, t, s.bl * 2, 0.5, 400, 1400);
    },
    calm(s, bar, t) {
      const pb = bar % 8, R = s.R, bi = s.bi; if (!pb) period(s, bar / 8 | 0);
      if (!(pb % 2)) s.chord(s.prog[pb >> 1], t);
      if (R() < (bi === 3 ? 0.18 : 0.3)) plink(s, rp(s), t + s.st * ((R() * 16) | 0), 0.5 + R() * 0.3, bi === 3 ? 4 : 2.4);
      if (pb === s.P.mb && s.P.mo) motif(s, t, s.k + 24, 0.55, 2.4);
      if (pb === 6 && R() < (bi === 0 ? 0.7 : 0.4)) swell(s, t, s.bl * 2, 0.6, bi === 3 ? 250 : 500, bi === 3 ? 3000 : 1600);
      if (bi === 1) for (let b = 0; b < 4; b++) if (R() < 0.3) drip(s, s.k + 36 + sd(s.sc, (R() * 7) | 0), t + (b * 4 + ((R() * 4) | 0)) * s.st, 0.6);
      if (bi === 2) for (let b = 0; b < 4; b++) tick(s, t + b * 4 * s.st, b % 2 ? 0.35 : 0.5, b % 2 ? 2600 : 3400);
      if (bi === 3 && pb === 3 && R() < 0.5) plink(s, s.k + 13, t, 0.35, 6);
      s.heart(t);
    },
    combat(s, bar, t) {
      const pb = bar % 8, R = s.R, bi = s.bi; if (!pb) period(s, bar / 8 | 0);
      if (!(pb % 2)) s.chord(s.prog[pb >> 1], t);
      kick(s, t, 0.9); kick(s, t + 8 * s.st, 0.65); if (R() < 0.3) kick(s, t + 14 * s.st, 0.35, 62, 0.25);
      if (bar >= 2) for (let i = 2; i < 16; i += 4) tick(s, t + i * s.st, i % 8 === 2 ? 0.5 : 0.35);
      if (bi === 2) for (let i = 0; i < 16; i += 4) tick(s, t + i * s.st, 0.3, 3000);
      if (bi === 1 && R() < 0.4) drip(s, s.k + 36 + sd(s.sc, (R() * 7) | 0), t + s.st * ((R() * 16) | 0), 0.5);
      if (R() < 0.15) plink(s, rp(s), t + s.st * ((R() * 16) | 0), 0.45, 2);
      s.heart(t);
    },
    boss(s, bar, t) {
      const pb = bar % 8, R = s.R, ph = phase(); if (!pb) period(s, bar / 8 | 0);
      if (!(pb % 2)) s.chord(s.prog[pb >> 1], t);
      for (const [i, v] of [[0, 1], [10, 0.6]]) { kick(s, t + i * s.st, v, 42, 0.65); s.duck(t + i * s.st); }
      if (ph > 1) { kick(s, t + 6 * s.st, 0.4, 46, 0.5); for (let i = 2; i < 16; i += 4) tick(s, t + i * s.st, 0.35); if (!s.hot) { s.hot = 1; s.pf.frequency.setTargetAtTime(s.B.cut * 1.1, t, 2); } }
      if (!(pb % (ph > 1 ? 2 : 4))) motif(s, t, s.k + 12, 0.6, 1.5, 0);
      if (R() < 0.1) plink(s, rp(s), t + s.st * ((R() * 16) | 0), 0.4, 2.5);
      s.heart(t);
    },
    dead(s, bar, t) {
      if (bar) return;
      s.chord('iv', t); s.chord('i', t + s.bl);
      [2, 1, 0].forEach((d, i) => plink(s, s.k + 12 + sd(s.sc, d), t + 0.2 + i * s.bl * 0.5, 0.6, 3.5));
      const e = t + s.bl * 1.5; for (const g of [s.dry, s.wet, s.ech]) g.gain.setTargetAtTime(0, e, 1.6);
      for (const x of s.src) if (x[1] > e + 14) { x[0].stop(e + 14); x[1] = e + 14; }
    },
    win(s, bar, t) {
      const k = s.k, sc = s.sc, R = s.R;
      if (bar < 9) {
        const x = ['I', 'I', 'IVM', 'IVM', 'vi', 'vi', 'Vs', 'V', 'I'][bar]; if (x !== s.lc) { s.chord(x, t); s.lc = x; }
        if (bar < 8) for (const h of [0, 1]) plink(s, k + 12 + sd(sc, bar * 2 + h), t + h * 8 * s.st, 0.4 + bar * 0.03, 3);
        else { [0, 4, 7, 12].forEach((x, i) => plink(s, k + 24 + x, t + i * 0.09, 0.5, 3.5)); swell(s, t, s.bl * 1.5, 0.5, 400, 2400); }
        return;
      }
      const pb = (bar - 9) % 8; if (!pb) period(s, (bar - 9) / 8 | 0);
      if (!(pb % 2)) s.chord(s.prog[pb >> 1], t);
      if (R() < 0.2) plink(s, rp(s), t + s.st * ((R() * 16) | 0), 0.4, 3);
    },
  };
  // conductor: one live song; a mode or level change fades the old song out (its own gains) while the new one fades in.
  // Exploring resumes each level's calm song at its next 8-bar period. Lookahead clock on AudioContext time; a stalled tab skips whole bars instead of bunching.
  const Music = {
    cur: null, mode: 'off', want: 'menu', bio: 0, cb: 0, cp: {},
    boot() { setInterval(() => this.tick(), 40); },
    tick() {
      if (this.want !== this.mode || (BIOM[this.mode] && this.bio !== this.cb)) this.swap();
      const s = this.cur; if (!s) return;
      const now = ac.currentTime, ah = document.hidden ? 1.2 : 0.3;
      if (s.next < now - s.bl) { const k = Math.ceil((now - s.next) / s.bl); s.next += k * s.bl; s.bar += k; }
      while (s.next < now + ah) { if (on) PLAY[s.m](s, s.bar, s.next); s.next += s.bl; s.bar++; }
    },
    swap() {
      const m = this.want, now = ac.currentTime, F = m === this.mode ? [1, 1] : FADE[m];
      const c = this.cur; if (c) { c.kill(now, F[0]); if (c.m === 'calm') this.cp[c.bi] = Math.ceil(c.bar / 8); }
      this.cur = m === 'off' ? null : mkSong(m, this.bio, now, F[1], m === 'calm' ? this.cp[this.bio] || 0 : 0); this.mode = m; this.cb = this.bio;
    },
  };
  S.music = m => { Music.want = m; };
  S.biome = f => { Music.bio = clamp(f | 0, 0, 3); };
  return S;
})();
