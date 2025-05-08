import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

export const users = new SharedArray('users', function() {
  return [
    { username: 'pro1@example.com', password: '1111' },
    { username: 'pro2@example.com', password: '1111' },
    { username: 'pro3@example.com', password: '1111' },
    { username: 'pro4@example.com', password: '1111' },
    { username: 'pro5@example.com', password: '1111' },
  ];
});

export function login(baseUrl, username, password) {
  const payload = JSON.stringify({
    email: username,
    password: password,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const loginRes = http.post(`${baseUrl}/api/auth/login`, payload, params);
  
  const success = check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has token': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.token !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    console.log(`Login failed for user ${username}`);
    return null;
  }
  
  try {
    const data = JSON.parse(loginRes.body);
    return data.token;
  } catch (e) {
    console.log(`Failed to parse login response: ${e.message}`);
    return null;
  }
}

export function getRandomUser() {
  return users[Math.floor(Math.random() * users.length)];
}

export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}
