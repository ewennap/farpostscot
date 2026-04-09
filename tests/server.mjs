import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const port = Number(process.argv[2] || 4173);
const require = createRequire(import.meta.url);
const {
  buildArticleMetadata,
  buildMatchMetadata,
  injectMetadataBlock,
  readTemplateHtml
} = require('../lib/page-head.js');
const { getArticlePost, getMatchFixture } = require('./ssr-fixtures.cjs');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    const origin = `http://127.0.0.1:${port}`;

    if (pathname === '/') pathname = '/index.html';

    if (pathname === '/article.html') {
      let html = await readTemplateHtml('article.html');
      const id = url.searchParams.get('id');
      const post = getArticlePost(id);
      if (post) {
        html = injectMetadataBlock(html, buildArticleMetadata(post, { origin, id: post._id }));
      }
      res.writeHead(200, { 'content-type': mimeTypes['.html'] });
      res.end(html);
      return;
    }

    if (pathname === '/match.html') {
      let html = await readTemplateHtml('match.html');
      const id = url.searchParams.get('id');
      const fixture = getMatchFixture(id);
      if (fixture) {
        html = injectMetadataBlock(html, buildMatchMetadata(fixture, {
          origin,
          leagueId: url.searchParams.get('league') || fixture.league_id
        }));
      }
      res.writeHead(200, { 'content-type': mimeTypes['.html'] });
      res.end(html);
      return;
    }

    const filePath = path.join(root, pathname);
    const file = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'content-type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(file);
  } catch (error) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log('Static server listening on', port);
});
