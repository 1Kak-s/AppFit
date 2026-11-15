import { Injectable } from '@angular/core';

/**
 * Affiche le repos sur l'écran verrouillé : on joue un son muet de la durée du repos, terminé par trois bips.
 * Le lecteur média du téléphone montre alors le temps restant, et le bip prévient même écran éteint.
 */
@Injectable({ providedIn: 'root' })
export class LockScreenAudio {
  private audio: HTMLAudioElement | null = null;
  private url: string | null = null;

  play(seconds: number, title: string, subtitle: string, onPause: () => void): void {
    const duration = Math.max(1, seconds);
    try {
      this.audio ??= Object.assign(new Audio(), { playsInline: true });
      if (this.url) URL.revokeObjectURL(this.url);
      this.url = silentWavWithBeeps(duration + 1, duration);
      this.audio.src = this.url;
      void this.audio.play().catch(() => undefined);

      if ('mediaSession' in navigator && 'MediaMetadata' in window) {
        const end = new Date(Date.now() + duration * 1000).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        navigator.mediaSession.metadata = new MediaMetadata({
          title,
          artist: `${subtitle} · fin à ${end}`,
          album: 'Carnet',
          artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
        });
        navigator.mediaSession.setActionHandler('pause', onPause);
      }
    } catch {
      // Lecture audio refusée par le navigateur : le minuteur à l'écran continue de fonctionner.
    }
  }

  stop(): void {
    try {
      this.audio?.pause();
    } catch {
      // Rien à arrêter.
    }
  }
}

/** Fabrique un fichier WAV 8 bits : du silence, puis trois bips à `beepAt` secondes. */
function silentWavWithBeeps(totalSeconds: number, beepAt: number): string {
  const rate = 8000;
  const samples = Math.ceil(totalSeconds * rate);
  const buffer = new Uint8Array(44 + samples);
  const view = new DataView(buffer.buffer);
  const ascii = (offset: number, value: string) =>
    [...value].forEach((c, i) => (buffer[offset + i] = c.charCodeAt(0)));

  ascii(0, 'RIFF');
  view.setUint32(4, 36 + samples, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  ascii(36, 'data');
  view.setUint32(40, samples, true);
  buffer.fill(128, 44);

  const beepLength = Math.floor(0.17 * rate);
  for (let beep = 0; beep < 3; beep++) {
    const start = Math.floor((beepAt + beep * 0.3) * rate);
    for (let i = 0; i < beepLength; i++) {
      const index = 44 + start + i;
      const fade = Math.min(1, i / 60, (beepLength - i) / 60);
      if (index < buffer.length)
        buffer[index] = 128 + Math.round(100 * Math.sin((2 * Math.PI * 880 * i) / rate) * fade);
    }
  }
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}
