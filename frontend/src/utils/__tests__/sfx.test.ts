import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStop = vi.fn()
const mockStart = vi.fn()
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

const AudioContextMock = vi.fn(() => ({
  currentTime: 0,
  state: 'running',
  destination: {},
  resume: vi.fn().mockResolvedValue(undefined),
  createOscillator: vi.fn(() => ({ ...mockOscillator })),
  createGain: vi.fn(() => ({ ...mockGainNode })),
}))

vi.stubGlobal('AudioContext', AudioContextMock)

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('sfx', () => {
  it('playHitSfx creates oscillator and schedules stop', async () => {
    const { playHitSfx } = await import('../sfx')
    await playHitSfx()
    expect(mockStart).toHaveBeenCalled()
    expect(mockStop).toHaveBeenCalled()
  })

  it('playPlayerHitSfx creates oscillator and schedules stop', async () => {
    const { playPlayerHitSfx } = await import('../sfx')
    await playPlayerHitSfx()
    expect(mockStart).toHaveBeenCalled()
    expect(mockStop).toHaveBeenCalled()
  })

  it('playKillSfx creates two oscillators (dual layer)', async () => {
    const { playKillSfx } = await import('../sfx')
    await playKillSfx()
    expect(mockStart).toHaveBeenCalledTimes(2)
    expect(mockStop).toHaveBeenCalledTimes(2)
  })

  it('getCtx reuses AudioContext singleton across calls', async () => {
    const { playHitSfx } = await import('../sfx')
    await playHitSfx()
    await playHitSfx()
    expect(AudioContextMock).toHaveBeenCalledTimes(1)
  })

  it('gracefully handles AudioContext creation failure', async () => {
    AudioContextMock.mockImplementationOnce(() => { throw new Error('not allowed') })
    const { playHitSfx } = await import('../sfx')
    await expect(playHitSfx()).resolves.toBeUndefined()
    expect(mockStart).not.toHaveBeenCalled()
  })

  it('calls resume() when AudioContext is suspended', async () => {
    const resumeMock = vi.fn().mockResolvedValue(undefined)
    AudioContextMock.mockImplementationOnce(() => ({
      currentTime: 0,
      state: 'suspended',
      destination: {},
      resume: resumeMock,
      createOscillator: vi.fn(() => ({ ...mockOscillator })),
      createGain: vi.fn(() => ({ ...mockGainNode })),
    }))
    const { playHitSfx } = await import('../sfx')
    await playHitSfx()
    expect(resumeMock).toHaveBeenCalled()
  })
})
