import fs from 'fs';
import path from 'path';

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.js')) {
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
      fs.writeFileSync(p, content);
    }
  });
}
walk('src');
