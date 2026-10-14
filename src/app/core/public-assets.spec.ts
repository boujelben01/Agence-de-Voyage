import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicFile = (name: string): string => join(root, 'public', name);

interface Manifest {
  name: string;
  short_name: string;
  theme_color: string;
  background_color: string;
  display: string;
  icons: { src: string; sizes: string; type: string }[];
}

describe('icônes de l’application', () => {
  it('fournit les fichiers d’icône attendus', () => {
    for (const name of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
      expect(existsSync(publicFile(name)), name).toBe(true);
    }
  });

  it('déclare un manifeste dont les icônes existent', () => {
    const manifest = JSON.parse(readFileSync(publicFile('site.webmanifest'), 'utf8')) as Manifest;
    expect(manifest.name).toBe('Agence de Voyage');
    expect(manifest.short_name).toBe('Agence');
    expect(manifest.theme_color).toBe('#145779');
    expect(manifest.background_color).toBe('#ffffff');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512']);
    for (const icon of manifest.icons) {
      expect(existsSync(publicFile(icon.src)), icon.src).toBe(true);
    }
  });

  it('référence les icônes et le manifeste dans index.html', () => {
    const html = readFileSync(join(root, 'src', 'index.html'), 'utf8');
    expect(html).toContain('rel="icon" type="image/svg+xml" href="favicon.svg"');
    expect(html).toContain('rel="icon" href="favicon.ico" sizes="any"');
    expect(html).toContain('rel="apple-touch-icon" href="apple-touch-icon.png"');
    expect(html).toContain('rel="manifest" href="site.webmanifest"');
    expect(html).toContain('name="theme-color" content="#145779"');
  });

  it('contient un favicon.ico à trois tailles (16, 32, 48)', () => {
    const ico = readFileSync(publicFile('favicon.ico'));
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(3);
    const sizes = [0, 1, 2].map((i) => ico.readUInt8(6 + i * 16));
    expect(sizes).toEqual([16, 32, 48]);
  });
});
