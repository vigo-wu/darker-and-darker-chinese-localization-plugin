const API_BASE = import.meta.env.DEV ? '/api' : 'https://api.darkerdb.com';

function buildUrl(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`, import.meta.env.DEV ? window.location.origin : undefined);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value != null) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export async function fetchApi(path, params = {}) {
  const response = await fetch(buildUrl(path, params));
  if (!response.ok) {
    throw new Error(`API 请求失败 (${response.status})`);
  }

  const data = await response.json();
  if (data.status !== 'OK') {
    throw new Error(data.message || 'API 返回异常');
  }
  return data;
}

export function getItemIconUrl(itemId) {
  return `${API_BASE}/v1/items/${encodeURIComponent(itemId)}/icon`;
}

export const fetchMarket = (params) =>
  fetchApi('/v1/market', { condense: 'true', limit: '25', ...params });

export const fetchItems = (params) =>
  fetchApi('/v1/items', { condense: 'true', limit: '25', ...params });

export const fetchAttributes = async () => {
  const data = await fetchApi('/v1/items/attributes');
  return data.body || [];
};

export const fetchPopulation = async () => {
  const data = await fetchApi('/v1/population');
  return data.body || {};
};

export const fetchHealthCheck = () => fetchApi('/v1/health-check');
