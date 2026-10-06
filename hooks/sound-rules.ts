/** Two completions inside this window sound once. */
export const SOUND_DEBOUNCE_MS = 2000

const SOUND_DIR = '/usr/share/sounds/freedesktop/stereo'
const ALSA_SOUND = '/usr/share/sounds/alsa/Front_Center.wav'

// Frequency (Hz) and length (ms) of each beep of the finished-task chime.
const BEEPS: readonly (readonly [number, number])[] = [[523, 120], [659, 120], [784, 180]]

/** WSL is told by `microsoft` in /proc/version or a set WSL_DISTRO_NAME. */
export function isWsl(procVersion: string | undefined, distro: string | undefined): boolean {
  return /microsoft/i.test(procVersion ?? '') || (distro !== undefined && distro !== '')
}

export function wslCommand(): readonly string[] {
  const beeps = BEEPS.map(([hz, ms]) => `[Console]::Beep(${hz}, ${ms});`).join('')
  return ['powershell.exe', '-WindowStyle', 'Hidden', '-Command', beeps]
}

/** Tried in order on Ubuntu until one exits 0: complete.oga, bell.oga, then ALSA's default. */
export function ubuntuCommands(): readonly (readonly string[])[] {
  return [['paplay', `${SOUND_DIR}/complete.oga`], ['paplay', `${SOUND_DIR}/bell.oga`], ['aplay', ALSA_SOUND]]
}
