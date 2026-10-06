export const API_URL = 'http://localhost:4000/api';

export const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`);
  return res.json() as T;
};

export const post = async (path: string, body: unknown) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};
