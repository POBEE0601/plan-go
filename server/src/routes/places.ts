// 2026-09-01 Places 라우트 분당 한도 적용 (검색·병원 남용 방지)
// 2026-08-31 Google Places 검색·이동수단 API
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { getRouteDetails, getTransitSummary } from '../services/googleDirections.js';
import { getPlaceDetails, searchNearbyHospitals, searchPlaces, searchCities } from '../services/googlePlaces.js';

const router = Router();
router.use(authMiddleware);
router.use(rateLimit(40));

router.get('/search', async (req, res) => {
  const query = String(req.query.q ?? '').trim();
  const lat = req.query.lat != null ? Number(req.query.lat) : undefined;
  const lng = req.query.lng != null ? Number(req.query.lng) : undefined;

  if (!query) {
    res.status(400).json({ message: '검색어(q)가 필요합니다.' });
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
});

// 일정 생성용: 국가·도시만 검색
router.get('/cities', async (req, res) => {
  const query = String(req.query.q ?? '').trim();
  if (!query) {
    res.status(400).json({ message: '검색어(q)가 필요합니다.' });
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
});

router.get('/details/:placeId', async (req, res) => {
  try {
    const detail = await getPlaceDetails(String(req.params.placeId));
    if (!detail) {
      res.status(404).json({ message: '장소 정보를 찾을 수 없습니다.' });
      return;
    }
    res.json(detail);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '장소 상세 조회에 실패했습니다.';
    res.status(502).json({ message });
  }
});

// 2026-09-01 좌표 기준 근처 병원·의원
router.get('/nearby-hospitals', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  const limit = req.query.limit != null ? Number(req.query.limit) : 5;
  const withPhones = req.query.phones === '1' || req.query.phones === 'true';

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    res.status(400).json({ message: 'lat, lng가 필요합니다.' });
    return;
  }

  try {
    const hospitals = await searchNearbyHospitals(lat, lng, {
      limit: Number.isNaN(limit) ? 5 : limit,
      withPhones,
    });
    res.json(hospitals);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '근처 병원 조회에 실패했습니다.';
    res.status(502).json({ message });
  }
});

// 두 좌표 사이 이동수단 요약
router.get('/transit', async (req, res) => {
  const fromLat = Number(req.query.fromLat);
  const fromLng = Number(req.query.fromLng);
  const toLat = Number(req.query.toLat);
  const toLng = Number(req.query.toLng);

  if ([fromLat, fromLng, toLat, toLng].some((n) => Number.isNaN(n))) {
    res
      .status(400)
      .json({ message: 'fromLat, fromLng, toLat, toLng가 필요합니다.' });
    return;
  }

  try {
    const summary = await getTransitSummary(fromLat, fromLng, toLat, toLng);
    res.json(summary);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '이동 정보 조회에 실패했습니다.';
    res.status(502).json({ message });
  }
});

// 두 좌표 사이 상세 길찾기 (단계별)
router.get('/directions', async (req, res) => {
  const fromLat = Number(req.query.fromLat);
  const fromLng = Number(req.query.fromLng);
  const toLat = Number(req.query.toLat);
  const toLng = Number(req.query.toLng);
  const fromName =
    typeof req.query.fromName === 'string' ? req.query.fromName : undefined;
  const toName =
    typeof req.query.toName === 'string' ? req.query.toName : undefined;
  const modeRaw = String(req.query.mode ?? 'driving');
  const onlyMode =
    modeRaw === 'walking' || modeRaw === 'transit' || modeRaw === 'driving'
      ? modeRaw
      : 'driving';

  if ([fromLat, fromLng, toLat, toLng].some((n) => Number.isNaN(n))) {
    res
      .status(400)
      .json({ message: 'fromLat, fromLng, toLat, toLng가 필요합니다.' });
    return;
  }

  try {
    const details = await getRouteDetails(
      fromLat,
      fromLng,
      toLat,
      toLng,
      fromName,
      toName,
      onlyMode,
    );
    res.json(details);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : '상세 길찾기 조회에 실패했습니다.';
    res.status(502).json({ message });
  }
});

export default router;
