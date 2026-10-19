import type { PhaseEvent } from '@shared/studyTimer'

let context: AudioContext | null = null

// E5 and A5: going down to relax for the break, going up to get back to work
const NOTES: Record<PhaseEvent, number[]> = {
  breakStarted: [880, 659.25],
  breakEnded: [659.25, 880]
}

/** A soft two-note chime made with the Web Audio API, so no sound files are needed. */
export function playChime(event: PhaseEvent): void {
  context ??= new AudioContext()
  const audio = context
  if (audio.state === 'suspended') audio.resume()

  NOTES[event].forEach((frequency, index) => {
    const start = audio.currentTime + index * 0.2
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    // Quick fade in and a long fade out, like a small bell
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 1)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(start)
    oscillator.stop(start + 1.1)
  })
}
