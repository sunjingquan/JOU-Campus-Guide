/**
 * @file API 服务层（自建后端 REST 适配版）
 * @description 封装校园指南前端与家庭服 Node/SQLite 后端及社区 SSO 的全部通信接口。
 */

async function requestJson(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || `请求失败 (${res.status})`);
  }
  return payload;
}

export async function getGuideData() {
  try {
    const result = await requestJson('/api/guide');
    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('API Service: Failed to fetch /api/guide:', error);
    return [];
  }
}

export async function getCampusData() {
  try {
    const result = await requestJson('/api/campus');
    if (result.data && Array.isArray(result.data.colleges)) {
      return result.data;
    }
    return { campuses: [], dormitories: [], canteens: [], colleges: [] };
  } catch (error) {
    console.error('API Service: Failed to fetch /api/campus:', error);
    return { campuses: [], dormitories: [], canteens: [], colleges: [] };
  }
}

export async function getCurrentSession() {
  return await requestJson('/api/auth/me');
}

export async function logoutSession() {
  return await requestJson('/api/auth/logout', { method: 'POST' });
}

export async function updateMyProfile(updatedData) {
  const res = await requestJson('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(updatedData)
  });
  return res.user;
}

export async function getMaterials(options = {}) {
  const {
    college = '',
    major = '',
    searchTerm = '',
    sortBy = 'createdAt',
    order = 'desc'
  } = options;

  try {
    const qs = new URLSearchParams();
    if (college) qs.set('college', college);
    if (major) qs.set('major', major);
    if (searchTerm) qs.set('searchTerm', searchTerm);
    if (sortBy) qs.set('sortBy', sortBy);
    if (order) qs.set('order', order);
    const result = await requestJson(`/api/materials?${qs.toString()}`);
    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('API Service: Failed to fetch materials:', error);
    return [];
  }
}

export function uploadMaterialWithProgress(file, metadata, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/materials/upload');
    xhr.withCredentials = true;
    const encodedMeta = btoa(unescape(encodeURIComponent(JSON.stringify(metadata))));
    xhr.setRequestHeader('X-Material-Meta', encodedMeta);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          onProgress(evt);
        }
      };
    }

    xhr.onload = () => {
      let body = {};
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new Error(body.error || `上传失败 (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('网络异常，上传中断'));
    xhr.send(file);
  });
}

export async function requestMaterialDownloadUrl(docId) {
  return await requestJson(`/api/materials/${encodeURIComponent(docId)}/download`, {
    method: 'POST'
  });
}

export async function checkIfUserRated(materialId) {
  try {
    const result = await requestJson(`/api/materials/${encodeURIComponent(materialId)}/rated`);
    return Boolean(result.rated);
  } catch {
    return false;
  }
}

export async function addRating(materialId, _userId, _studentId, rating) {
  return await requestJson(`/api/materials/${encodeURIComponent(materialId)}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating })
  });
}

export async function submitFeedback(feedbackData) {
  return await requestJson('/api/feedback', {
    method: 'POST',
    body: JSON.stringify(feedbackData)
  });
}
