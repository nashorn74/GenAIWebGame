/**
 * Web Audio API 기반 프로그래밍 효과음.
 * 오디오 파일 없이 사운드를 생성한다.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** 플레이어가 몬스터를 타격할 때 */
export function playHitSfx() {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain).connect(ac.destination);

  osc.type = 'square';
  osc.frequency.setValueAtTime(200, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.08);

  gain.gain.setValueAtTime(0.25, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);

  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.12);
}

/** 몬스터가 플레이어를 타격할 때 */
export function playPlayerHitSfx() {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain).connect(ac.destination);

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.15);

  gain.gain.setValueAtTime(0.2, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);

  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.15);
}

/** 몬스터 사망 시 */
export function playKillSfx() {
  const ac = getCtx();

  // 낮은 폭발음
  const osc1 = ac.createOscillator();
  const gain1 = ac.createGain();
  osc1.connect(gain1).connect(ac.destination);
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(150, ac.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.3);
  gain1.gain.setValueAtTime(0.3, ac.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
  osc1.start(ac.currentTime);
  osc1.stop(ac.currentTime + 0.3);

  // 높은 찰칵음
  const osc2 = ac.createOscillator();
  const gain2 = ac.createGain();
  osc2.connect(gain2).connect(ac.destination);
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(600, ac.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.15);
  gain2.gain.setValueAtTime(0.15, ac.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc2.start(ac.currentTime);
  osc2.stop(ac.currentTime + 0.15);
}
