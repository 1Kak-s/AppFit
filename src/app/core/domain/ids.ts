/** Identifiant aléatoire (générateur cryptographique du navigateur), ex. « x3k9f0a1b2c4d5e6f7 ». */
export function newId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return 'x' + Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('');
}
