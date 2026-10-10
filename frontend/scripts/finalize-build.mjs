import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const html=readFileSync('dist/index.html','utf8');
const data=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
if(!data)throw new Error('Missing structured data');
const hash=createHash('sha256').update(data).digest('base64');
const nginx=readFileSync('nginx.conf','utf8').replace(/sha256-[^']+/,`sha256-${hash}`);
writeFileSync('nginx.conf',nginx);
copyFileSync('dist/index.html','dist/404.html');
