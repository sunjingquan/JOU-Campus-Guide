/**
 * @file 校园指南前端数据、社区动态与反馈接口
 * @description 零外部依赖原生 Fetch 封装，并行请求指南与校区数据。
 */

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (HTTP ${res.status})`);
  }
  return data;
}

const ASSET_VERSION = '20261121-v3';

export async function loadAllGuideData() {
  const [guideRes, campusRes] = await Promise.all([
    fetchJson(`/api/guide?v=${ASSET_VERSION}`),
    fetchJson(`/api/campus?v=${ASSET_VERSION}`)
  ]);
  return {
    guideData: Array.isArray(guideRes.data) ? guideRes.data : [],
    campusData: campusRes.data || { campuses: [], canteens: [], dormitories: [], colleges: [] }
  };
}

export async function loadCommunityFeed() {
  try {
    const res = await fetchJson('/api/community-feed');
    return Array.isArray(res.topics) ? res.topics : [];
  } catch {
    return [];
  }
}

export async function submitFeedback({ content, contact, page }) {
  return fetchJson('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ content, contact, page })
  });
}
