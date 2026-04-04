/**
 * Web Audio API 기반 프로그래밍 효과음.
 * 오디오 파일 없이 사운드를 생성한다.
 */

interface ToneConfig {
  type: OscillatorType;
  freqStart: number;
  freqEnd: number;
  volume: number;
  duration: number;
}

const SFX_CONFIG = {
  hit:       { type: 'square'   as OscillatorType, freqStart: 200, freqEnd:  80, volume: 0.25, duration: 0.12 },
  playerHit: { type: 'sawtooth' as OscillatorType, freqStart: 300, freqEnd: 100, volume: 0.2,  duration: 0.15 },
  killBass:  { type: 'sine'     as OscillatorType, freqStart: 150, freqEnd:  40, volume: 0.3,  duration: 0.3  },
  killClick: { type: 'square'   as OscillatorType, freqStart: 600, freqEnd: 200, volume: 0.15, duration: 0.15 },
} as const;

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function playTone(ac: AudioContext, cfg: ToneConfig) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain).connect(ac.destination);

  osc.type = cfg.type;
  osc.frequency.setValueAtTime(cfg.freqStart, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(cfg.freqEnd, ac.currentTime + cfg.duration);

  gain.gain.setValueAtTime(cfg.volume, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + cfg.duration);

  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + cfg.duration);
}

/** 플레이어가 몬스터를 타격할 때 */
export function playHitSfx() {
  const ac = getCtx();
  if (!ac) return;
  playTone(ac, SFX_CONFIG.hit);
}

/** 몬스터가 플레이어를 타격할 때 */
export function playPlayerHitSfx() {
  const ac = getCtx();
  if (!ac) return;
  playTone(ac, SFX_CONFIG.playerHit);
}

/** 몬스터 사망 시 */
export function playKillSfx() {
  const ac = getCtx();
  if (!ac) return;
  playTone(ac, SFX_CONFIG.killBass);
  playTone(ac, SFX_CONFIG.killClick);
}
