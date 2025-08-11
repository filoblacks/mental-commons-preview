export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const lang = (url.searchParams.get('lang') || '').toLowerCase();
    const supported = { it: true, en: true };
    if (!supported[lang]) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'invalid_lang' }));
      return;
    }

    // Legge i file locali del repo
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'locales', `${lang}.json`);
    if (!fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    const json = fs.readFileSync(filePath, 'utf-8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.end(json);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'internal_error', message: String(err && err.message || err) }));
  }
}


