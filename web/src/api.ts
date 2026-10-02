export const API_URL = 'http://localhost:4000/api';

export const get = async (path: string) => {
  const res = await fetch(`${API_URL}${path}`);
  return res.json();
};

export const post = async (path: string, body: unknown) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};
