// 2026-10-02 Distance Matrix·일괄 상세·사진 조회 라우트 제거, 하루 한도
// 2026-09-01 Places 라우트 분당 한도 적용 (검색·병원 남용 방지)
// 2026-08-31 Google Places 검색·이동수단 API
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  getCityDetails,
  lookupPlacePhone,
  searchCities,
  searchNearbyHospitals,
  searchPlaces,
} from '../services/googlePlaces.js';

const DAY_MS = 86_400_000;
const PLACE_ID = /^[A-Za-z0-9_-]{10,200}$/;

const router = Router();
router.use(authMiddleware);

const perMinute = (name: string, max: number) => rateLimit(max, 60_000, name);
const perDay = (name: string, max: number) => rateLimit(max, DAY_MS, name);

router.get(
  '/search',
  perMinute('places-search-min', 10),
  perDay('places-search-day', 30),
  async (req, res) => {
    const query = String(req.query.q ?? '').trim();
    const lat = req.query.lat != null ? Number(req.query.lat) : undefined;
    const lng = req.query.lng != null ? Number(req.query.lng) : undefined;

    if (query.length < 2) {
      res.status(400).json({ message: '검색어는 두 글자 이상이어야 합니다.' });
      return;
    }

    try {
      const results = await searchPlaces(query, lat, lng);
      res.json(results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '장소 검색에 실패했습니다.';
      res.status(502).json({ message });
    }
  },
);

router.get(
  '/cities',
  perMinute('places-cities-min', 10),
  perDay('places-cities-day', 40),
  async (req, res) => {
    const query = String(req.query.q ?? '').trim();
    if (query.length < 2) {
      res.status(400).json({ message: '검색어는 두 글자 이상이어야 합니다.' });
      return;
    }

    try {
      const results = await searchCities(query);
      res.json(results);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '도시 검색에 실패했습니다.';
      res.status(502).json({ message });
    }
  },
);

router.get(
  '/cities/:placeId',
  perMinute('places-city-min', 10),
  perDay('places-city-day', 20),
  async (req, res) => {
    const placeId = String(req.params.placeId ?? '');
    if (!PLACE_ID.test(placeId)) {
      res.status(400).json({ message: '도시 id가 올바르지 않습니다.' });
      return;
    }

    try {
      const detail = await getCityDetails(placeId);
      if (!detail) {
        res.status(404).json({ message: '도시 정보를 찾을 수 없습니다.' });
        return;
      }
      res.json(detail);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '도시 정보를 불러오지 못했습니다.';
      res.status(502).json({ message });
    }
  },
);

router.get(
  '/nearby-hospitals',
  perMinute('places-hospital-min', 6),
  perDay('places-hospital-day', 20),
  async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const limit = req.query.limit != null ? Number(req.query.limit) : 5;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      res.status(400).json({ message: 'lat, lng가 필요합니다.' });
      return;
    }

    try {
      const hospitals = await searchNearbyHospitals(lat, lng, {
        limit: Number.isNaN(limit) ? 5 : limit,
      });
      res.json(hospitals);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '근처 병원 조회에 실패했습니다.';
      res.status(502).json({ message });
    }
  },
);

router.get(
  '/phone/:placeId',
  perMinute('places-phone-min', 8),
  perDay('places-phone-day', 20),
  async (req, res) => {
    const placeId = String(req.params.placeId ?? '');
    if (!PLACE_ID.test(placeId)) {
      res.status(400).json({ message: '장소 id가 올바르지 않습니다.' });
      return;
    }

    try {
      const phone = await lookupPlacePhone(placeId);
      res.json({ phone: phone ?? null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '전화번호를 불러오지 못했습니다.';
      res.status(502).json({ message });
    }
  },
);

export default router;
