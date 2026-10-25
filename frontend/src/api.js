
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // status and data let callers act on specific errors (e.g. a 409 with the conflicting product)
    throw Object.assign(new Error(data.message || 'Request failed'), { status: res.status, data });
  }

  return data;
}
