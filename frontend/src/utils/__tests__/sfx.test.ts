import { describe, it, expect, vi, beforeEach } from 'vitest'

// AudioContext mock
const mockStop = vi.fn()
const mockStart = vi.fn()
const mockConnect = vi.fn()
const mockSetValueAtTime = vi.fn()
const mockExponentialRamp = vi.fn()

const mockGainNode = {
  gain: { setValueAtTime: mockSetValueAtTime, exponentialRampToValueAtTime: mockExponentialRamp },
  connect: vi.fn().mockReturnThis(),
}
const mockOscillator = {
  type: '' as OscillatorType,
  frequency: { setValueAtTime: mockSetValueAtTime, exponentialRampToValueAtTime: mockExponentialRamp },
  connect: vi.fn().mockReturnValue(mockGainNode),
  start: mockStart,
  stop: mockStop,
}

vi.stubGlobal('AudioContext', vi.fn(() => ({
  currentTime: 0,
  destination: {},
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => ({ ...mockGainNode })),
})))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('sfx', () => {
  it('playHitSfx creates oscillator and schedules stop', async () => {
    // Re-import to get fresh module with our mock
    const { playHitSfx } = await import('../sfx')
    playHitSfx()
    expect(mockStart).toHaveBeenCalled()
    expect(mockStop).toHaveBeenCalled()
  })

  it('playPlayerHitSfx creates oscillator and schedules stop', async () => {
    const { playPlayerHitSfx } = await import('../sfx')
    playPlayerHitSfx()
    expect(mockStart).toHaveBeenCalled()
    expect(mockStop).toHaveBeenCalled()
  })

  it('playKillSfx creates two oscillators (dual layer)', async () => {
    const { playKillSfx } = await import('../sfx')
    playKillSfx()
    // Two oscillators: each calls start and stop
    expect(mockStart).toHaveBeenCalledTimes(2)
    expect(mockStop).toHaveBeenCalledTimes(2)
  })
})
