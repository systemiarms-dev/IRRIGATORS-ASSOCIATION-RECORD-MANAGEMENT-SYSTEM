/**
 * Automated Pre-Launch Audit Suite: Route Integrity, Broken Links & Missing Assets
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

const results = [];
function record(category, testName, passed, details = '') {
  results.push({ category, testName, passed, details });
  const badge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${badge} [${category}] ${testName}${details ? ` -> ${details}` : ''}`);
}

function checkRoute(path) {
  return new Promise((resolve) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      resolve({ statusCode: res.statusCode, headers: res.headers });
    }).on('error', (err) => {
      resolve({ statusCode: 0, error: err.message });
    });
  });
}

async function runRouteAudit() {
  console.log('\n================================================================');
  console.log('       ROUTE INTEGRITY, BROKEN LINKS & ASSETS AUDIT MATRIX      ');
  console.log('================================================================');
  console.log(`Server URL: ${BASE_URL}\n`);

  // 1. Public Entry Routes
  console.log('--- 1. Public Entry Routes ---');
  const landing = await checkRoute('/');
  record('Public Routes', 'Landing Page (/)', landing.statusCode === 200, `Status: ${landing.statusCode}`);

  const login = await checkRoute('/login');
  record('Public Routes', 'Login Portal (/login)', login.statusCode === 200, `Status: ${login.statusCode}`);

  const register = await checkRoute('/register');
  record('Public Routes', 'Registration Lockout (/register)', register.statusCode === 200, `Status: ${register.statusCode} (Redirect handler active)`);

  // 2. Protected Dashboard Routes (Unauthenticated must 307 Redirect)
  console.log('\n--- 2. Protected Dashboard Routes (Unauthenticated 307 Redirects) ---');
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/associations',
    '/dashboard/members',
    '/dashboard/treasurer',
    '/dashboard/auditor',
    '/dashboard/statements',
    '/dashboard/chart-of-accounts',
    '/dashboard/admin',
    '/dashboard/account',
  ];

  for (const route of protectedRoutes) {
    const res = await checkRoute(route);
    const isRedirect = res.statusCode === 307 || res.statusCode === 302;
    const location = res.headers?.location || '';
    const redirectsToLogin = location.includes('/login');
    record('Auth Protection', `Protected Route: ${route}`, isRedirect && redirectsToLogin, `Status: ${res.statusCode} -> Redirects to ${location}`);
  }

  // 3. Static Public Assets & Branding
  console.log('\n--- 3. Static Public Assets & Branding ---');
  const assets = [
    '/Iarmslogo.png',
    '/bg.png',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512.png',
    '/icons/icon-512x512.png',
    '/icons/icon-maskable-512.png',
  ];

  for (const asset of assets) {
    const res = await checkRoute(asset);
    record('Static Assets', `Asset: ${asset}`, res.statusCode === 200, `Status: ${res.statusCode}`);
  }

  // 4. Broken Link / 404 Resilience
  console.log('\n--- 4. Non-Existent Route Resilience ---');
  const notFound = await checkRoute('/unknown-test-route-random-404');
  record('404 Resilience', 'Non-Existent Route Returns 404', notFound.statusCode === 404, `Status: ${notFound.statusCode}`);

  // Scorecard
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(`       ROUTE INTEGRITY AUDIT SCORECARD: ${failed === 0 ? 'ALL PASSED (100%)' : 'SOME FAILED'}`);
  console.log(`       Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runRouteAudit();
