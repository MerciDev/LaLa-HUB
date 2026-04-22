/**
 * AudioManager — Zero-dependency, Web Audio API based SFX manager.
 *
 * Generates all sounds procedurally (no audio files needed) so they load
 * instantly and work offline / in Electron out of the box.
 *
 * Usage:
 *   import { sfx } from './audioManager'
 *   sfx.navigate()      // soft tick when moving the cursor
 *   sfx.confirm()       // positive bong when selecting / confirming
 *   sfx.cancel()        // negative whoosh when cancelling / going back
 *   sfx.open()          // panel open swoosh
 *   sfx.close()         // panel close swoosh
 *   sfx.error()         // error buzz
 */

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle'

interface Tone {
    frequency: number
    duration: number      // seconds
    gain: number          // 0 – 1
    type?: OscillatorType
    /** Frequency at the end of the tone (for sweeps). Defaults to frequency. */
    endFrequency?: number
    delay?: number        // seconds before enveloping, default 0
}

class AudioManager {
    private ctx: AudioContext | null = null
    private muted: boolean = false

    // Lazy-init the AudioContext (must be after a user gesture on some browsers)
    private getContext(): AudioContext {
        if (!this.ctx || this.ctx.state === 'closed') {
            this.ctx = new AudioContext()
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume()
        }
        return this.ctx
    }

    /**
     * Plays a sequence of tones at given offsets from now.
     */
    private play(tones: Tone[]): void {
        if (this.muted) return
        const ctx = this.getContext()
        const now = ctx.currentTime

        for (const tone of tones) {
            const startAt = now + (tone.delay ?? 0)
            const endAt = startAt + tone.duration

            const osc = ctx.createOscillator()
            const gainNode = ctx.createGain()

            osc.type = tone.type ?? 'sine'
            osc.frequency.setValueAtTime(tone.frequency, startAt)
            if (tone.endFrequency !== undefined) {
                osc.frequency.linearRampToValueAtTime(tone.endFrequency, endAt)
            }

            gainNode.gain.setValueAtTime(0, startAt)
            gainNode.gain.linearRampToValueAtTime(tone.gain, startAt + 0.01)
            gainNode.gain.exponentialRampToValueAtTime(0.001, endAt)

            osc.connect(gainNode)
            gainNode.connect(ctx.destination)

            osc.start(startAt)
            osc.stop(endAt)
        }
    }

    // ─── Public SFX ───────────────────────────────────────────────────────────

    /** Soft tick — cursor movement on the grid */
    navigate(): void {
        this.play([{ frequency: 620, endFrequency: 680, duration: 0.07, gain: 0.12, type: 'sine' }])
    }

    /** Positive bong — confirm / select */
    confirm(): void {
        this.play([
            { frequency: 440, duration: 0.08, gain: 0.18, type: 'sine' },
            { frequency: 660, duration: 0.12, gain: 0.15, type: 'sine', delay: 0.07 }
        ])
    }

    /** Negative whoosh — cancel / back */
    cancel(): void {
        this.play([
            { frequency: 480, endFrequency: 300, duration: 0.14, gain: 0.15, type: 'sine' }
        ])
    }

    /** Panel slides open — settings / modal open */
    open(): void {
        this.play([
            { frequency: 300, endFrequency: 550, duration: 0.18, gain: 0.12, type: 'sine' }
        ])
    }

    /** Panel slides closed */
    close(): void {
        this.play([
            { frequency: 550, endFrequency: 280, duration: 0.16, gain: 0.12, type: 'sine' }
        ])
    }

    /** Error buzz */
    error(): void {
        this.play([
            { frequency: 200, duration: 0.08, gain: 0.2, type: 'square' },
            { frequency: 180, duration: 0.1, gain: 0.15, type: 'square', delay: 0.08 }
        ])
    }

    /** Game launched — triumphant short sweep */
    launch(): void {
        this.play([
            { frequency: 330, duration: 0.07, gain: 0.15, type: 'sine' },
            { frequency: 440, duration: 0.07, gain: 0.15, type: 'sine', delay: 0.07 },
            { frequency: 660, duration: 0.18, gain: 0.18, type: 'sine', delay: 0.14 }
        ])
    }

    /** Toggle mute on/off */
    setMuted(muted: boolean): void {
        this.muted = muted
    }

    isMuted(): boolean {
        return this.muted
    }
}

/** Singleton instance — import and use anywhere in the renderer. */
export const sfx = new AudioManager()
