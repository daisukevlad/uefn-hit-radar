// JSONファイルベースの簡易ストレージ
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const SNAP_DIR = path.join(DATA_DIR, 'snapshots');

fs.mkdirSync(SNAP_DIR, { recursive: true });

export function load(name, fallback) {
  const p = path.join(DATA_DIR, name);
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

export function save(name, obj) {
  const p = path.join(DATA_DIR, name);
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, p);
}

export function saveSnapshot(dateStr, obj) {
  fs.writeFileSync(path.join(SNAP_DIR, `${dateStr}.json`), JSON.stringify(obj));
}

export function listSnapshots() {
  try {
    return fs.readdirSync(SNAP_DIR).filter((f) => f.endsWith('.json')).sort();
  } catch {
    return [];
  }
}

export function loadSnapshot(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(SNAP_DIR, file), 'utf8'));
  } catch {
    return null;
  }
}

export const today = () => new Date().toISOString().slice(0, 10);
