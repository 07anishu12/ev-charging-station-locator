#!/usr/bin/env node

/**
 * FastCharger Architecture Explorer - Local 3D Graph Server
 * Serves graphify-out/3d/ and graphify-out/graph.json with CORS and zero dependencies.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { exec } = require('node:child_process');

const GRAPHIFY_OUT_DIR = path.resolve(__dirname, '..');
const REPO_ROOT_DIR = path.resolve(__dirname, '../..');

const DEFAULT_PORT = parseInt(process.env.PORT || '3333', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

function resolveFilePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);

  // Route root or /3d/
  if (cleanPath === '/' || cleanPath === '/index.html') {
    return path.join(__dirname, 'index.html');
  }
  if (cleanPath === '/3d' || cleanPath === '/3d/') {
    return path.join(__dirname, 'index.html');
  }
  if (cleanPath.startsWith('/3d/')) {
    const rel = cleanPath.slice('/3d/'.length);
    return path.join(__dirname, rel);
  }

  // Route graph.json
  if (cleanPath === '/graph.json' || cleanPath === '/graphify-out/graph.json') {
    return path.join(GRAPHIFY_OUT_DIR, 'graph.json');
  }

  // Route GRAPH_REPORT.md
  if (cleanPath === '/GRAPH_REPORT.md' || cleanPath === '/graphify-out/GRAPH_REPORT.md') {
    return path.join(GRAPHIFY_OUT_DIR, 'GRAPH_REPORT.md');
  }

  // Fallback to checking graphify-out or repo root
  const directGraphify = path.join(GRAPHIFY_OUT_DIR, cleanPath.replace(/^\/+/, ''));
  if (fs.existsSync(directGraphify) && fs.statSync(directGraphify).isFile()) {
    return directGraphify;
  }

  const directRepo = path.join(REPO_ROOT_DIR, cleanPath.replace(/^\/+/, ''));
  if (fs.existsSync(directRepo) && fs.statSync(directRepo).isFile()) {
    return directRepo;
  }

  return null;
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    // Add CORS & dev headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    const filePath = resolveFilePath(req.url);

    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${req.url}`);
      return;
    }

    try {
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        const indexHtml = path.join(filePath, 'index.html');
        if (fs.existsSync(indexHtml)) {
          const content = fs.readFileSync(indexHtml);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
          return;
        }
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': content.length,
      });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Internal Server Error: ${err.message}`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}/3d/`;
    console.log('\n============================================================');
    console.log('  🌐 Graphify 3D Architecture Viewer');
    console.log('============================================================');
    console.log(`  📍 Local URL:   ${url}`);
    console.log(`  📂 Graph JSON:  ${path.join(GRAPHIFY_OUT_DIR, 'graph.json')}`);
    console.log('  ⌨️  Controls:   Rotate (Drag L-click) | Pan (R-click) | Zoom (Wheel)');
    console.log('  🛑 Stop:        Press Ctrl+C');
    console.log('============================================================\n');

    const shouldOpen = !process.env.CI && !process.argv.includes('--no-open');
    if (shouldOpen) {
      const cmd =
        process.platform === 'darwin'
          ? `open "${url}"`
          : process.platform === 'win32'
          ? `start "${url}"`
          : `xdg-open "${url}"`;
      exec(cmd, () => {});
    }
  });
}

startServer(DEFAULT_PORT);
