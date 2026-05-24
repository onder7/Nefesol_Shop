import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

const execAsync = promisify(exec);

const BACKUP_DIR = path.join(process.cwd(), 'backups');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

// DATABASE_URL → bağlantı parçaları
function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    pass: decodeURIComponent(u.password),
    db:   u.pathname.replace(/^\//, ''),
  };
}

// ─── pg_dump ile yedek al ─────────────────────────────────────────────────────

export async function createBackup(): Promise<{ filename: string; size: number; path: string }> {
  ensureBackupDir();

  const db = parseDbUrl(process.env.DATABASE_URL!);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup-${ts}.sql`;
  const filepath = path.join(BACKUP_DIR, filename);

  // pg_dump varsa kullan
  try {
    const pgDumpCmd = `PGPASSWORD="${db.pass}" pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.db} -F p --no-acl --no-owner -f "${filepath}"`;
    await execAsync(pgDumpCmd);
    const { size } = fs.statSync(filepath);
    logger.info('pg_dump yedek oluşturuldu', { filename, size });
    return { filename, size, path: filepath };
  } catch (pgErr) {
    logger.warn('pg_dump bulunamadı, JSON yedeğe geçiliyor', { err: (pgErr as Error).message });
  }

  // Fallback: kritik tabloları JSON olarak dışa aktar
  const jsonFilename = `backup-${ts}.json`;
  const jsonPath = path.join(BACKUP_DIR, jsonFilename);

  const [products, categories, brands, orders, users] = await Promise.all([
    prisma.product.findMany({ include: { variants: true, images: true, tags: true } }),
    prisma.category.findMany(),
    prisma.brand.findMany(),
    prisma.order.findMany({ include: { items: true } }),
    prisma.user.findMany({ select: { id: true, email: true, role: true, createdAt: true } }),
  ]);

  const dump = {
    exportedAt: new Date().toISOString(),
    tables: { products, categories, brands, orders, users },
  };

  fs.writeFileSync(jsonPath, JSON.stringify(dump, null, 2), 'utf-8');
  const { size } = fs.statSync(jsonPath);
  logger.info('JSON yedek oluşturuldu', { filename: jsonFilename, size });
  return { filename: jsonFilename, size, path: jsonPath };
}

// ─── Yedek listesi ────────────────────────────────────────────────────────────

export interface BackupFile {
  filename: string;
  size:     number;
  sizeHuman: string;
  createdAt: string;
}

export function listBackups(): BackupFile[] {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith('backup-') && (f.endsWith('.sql') || f.endsWith('.json')))
    .map((filename) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, filename));
      return {
        filename,
        size: stat.size,
        sizeHuman: formatBytes(stat.size),
        createdAt: stat.birthtime.toISOString(),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getBackupPath(filename: string): string | null {
  // Güvenlik: dosya adında dizin geçişi engelle
  const safe = path.basename(filename);
  if (!safe.startsWith('backup-') || !(safe.endsWith('.sql') || safe.endsWith('.json'))) return null;
  const full = path.join(BACKUP_DIR, safe);
  return fs.existsSync(full) ? full : null;
}

export function deleteBackup(filename: string): boolean {
  const p = getBackupPath(filename);
  if (!p) return false;
  fs.unlinkSync(p);
  return true;
}

// ─── Zamanlama ayarları ───────────────────────────────────────────────────────

export interface BackupSchedule {
  enabled:   boolean;
  frequency: 'daily' | 'weekly';
  hour:      number;   // 0-23
  weekday:   number;   // 0=Pazar..6=Cumartesi (sadece weekly için)
  keepCount: number;   // kaç yedek tutulsun
}

const DEFAULTS: BackupSchedule = {
  enabled: false, frequency: 'daily', hour: 2, weekday: 0, keepCount: 7,
};

export async function getBackupSchedule(): Promise<BackupSchedule> {
  const rows = await prisma.siteSettings.findMany({
    where: { key: { startsWith: 'tools_backup_' } },
  });
  const m = Object.fromEntries(rows.map((r) => [r.key.slice('tools_backup_'.length), r.value]));
  return {
    enabled:   m['enabled']   === 'true',
    frequency: (m['frequency'] as 'daily' | 'weekly') || DEFAULTS.frequency,
    hour:      m['hour']      !== undefined ? Number(m['hour'])      : DEFAULTS.hour,
    weekday:   m['weekday']   !== undefined ? Number(m['weekday'])   : DEFAULTS.weekday,
    keepCount: m['keep_count']!== undefined ? Number(m['keep_count']): DEFAULTS.keepCount,
  };
}

export async function saveBackupSchedule(schedule: BackupSchedule): Promise<void> {
  const entries: Record<string, string> = {
    tools_backup_enabled:    String(schedule.enabled),
    tools_backup_frequency:  schedule.frequency,
    tools_backup_hour:       String(schedule.hour),
    tools_backup_weekday:    String(schedule.weekday),
    tools_backup_keep_count: String(schedule.keepCount),
  };
  await prisma.$transaction(
    Object.entries(entries).map(([key, value]) =>
      prisma.siteSettings.upsert({
        where:  { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
}

// Eski yedekleri temizle
export function pruneOldBackups(keepCount: number) {
  const files = listBackups();
  if (files.length <= keepCount) return;
  files.slice(keepCount).forEach((f) => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f.filename)); }
    catch { /* ignore */ }
  });
}

// ─── Cron reload hook (set by server.ts) ─────────────────────────────────────

export let triggerScheduleReload: (() => void) | undefined;

export function setScheduleReloadHook(fn: () => void) {
  triggerScheduleReload = fn;
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}
