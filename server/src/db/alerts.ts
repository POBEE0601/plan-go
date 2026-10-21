// 2026-10-21 관리자가 적은 여행 알림. 멤버는 읽고 숨기기만 한다
import { countryLabel, isAlertCountryKey } from '../data/alertCountries.js';
import type { TravelAlert } from '../types/travel.js';
import { pool } from './pool.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const mapAlert = (row: Record<string, unknown>): TravelAlert => ({
  id: String(row.id),
  countryKey: String(row.country_key),
  countryLabel: countryLabel(String(row.country_key)),
  title: String(row.title),
  body: String(row.body),
  source: row.source == null ? '' : String(row.source),
  severity: row.severity === 'info' ? 'info' : 'important',
  startsOn: String(row.starts_on),
  endsOn: row.ends_on == null || row.ends_on === '' ? null : String(row.ends_on),
  confirmedOn: String(row.confirmed_on),
});

export const listMatchingAlerts = async (
  countryKey: string,
  startDate: string,
  endDate: string,
  userId: string,
): Promise<TravelAlert[]> => {
  const { rows } = await pool.query(
    `SELECT a.*
     FROM travel_alerts a
     WHERE a.country_key = $1
       AND a.starts_on <= $3
       AND (a.ends_on IS NULL OR a.ends_on = '' OR a.ends_on >= $2)
       AND NOT EXISTS (
         SELECT 1 FROM travel_alert_dismissals d
         WHERE d.alert_id = a.id AND d.user_id = $4
       )
     ORDER BY a.starts_on, a.id`,
    [countryKey, startDate, endDate, userId],
  );
  return rows.map((row) => mapAlert(row as Record<string, unknown>));
};

export const dismissTravelAlert = async (
  userId: string,
  alertId: string,
): Promise<boolean> => {
  const found = await pool.query(`SELECT 1 FROM travel_alerts WHERE id = $1`, [
    alertId,
  ]);
  if (!found.rows[0]) return false;
  await pool.query(
    `INSERT INTO travel_alert_dismissals (alert_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [alertId, userId],
  );
  return true;
};

export const listAllAlerts = async (): Promise<TravelAlert[]> => {
  const { rows } = await pool.query(
    `SELECT * FROM travel_alerts ORDER BY starts_on DESC, id DESC`,
  );
  return rows.map((row) => mapAlert(row as Record<string, unknown>));
};

const clip = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export const createTravelAlert = async (raw: {
  countryKey?: unknown;
  title?: unknown;
  body?: unknown;
  source?: unknown;
  severity?: unknown;
  startsOn?: unknown;
  endsOn?: unknown;
  confirmedOn?: unknown;
}): Promise<TravelAlert> => {
  const countryKey = clip(raw.countryKey, 40);
  const title = clip(raw.title, 80);
  const body = clip(raw.body, 1000);
  const source = clip(raw.source, 200);
  const startsOn = clip(raw.startsOn, 10);
  const endsOn = clip(raw.endsOn, 10);
  const confirmedOn = clip(raw.confirmedOn, 10);
  const severity = raw.severity === 'info' ? 'info' : 'important';
  if (!isAlertCountryKey(countryKey) || !title || !body) {
    throw new Error('입력값을 확인해 주세요.');
  }
  if (!DATE_RE.test(startsOn) || !DATE_RE.test(confirmedOn)) {
    throw new Error('입력값을 확인해 주세요.');
  }
  if (endsOn && !DATE_RE.test(endsOn)) {
    throw new Error('입력값을 확인해 주세요.');
  }
  if (endsOn && endsOn < startsOn) {
    throw new Error('입력값을 확인해 주세요.');
  }
  const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await pool.query(
    `INSERT INTO travel_alerts
      (id, country_key, title, body, source, severity, starts_on, ends_on, confirmed_on)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      id,
      countryKey,
      title,
      body,
      source,
      severity,
      startsOn,
      endsOn || null,
      confirmedOn,
    ],
  );
  return mapAlert(rows[0] as Record<string, unknown>);
};

export const deleteTravelAlert = async (id: string): Promise<boolean> => {
  const result = await pool.query(`DELETE FROM travel_alerts WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
};
