const { fromUrl, inv, store } = require('./riot');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 20000) reject(new Error('ข้อมูลที่ส่งมามีขนาดใหญ่เกินไป'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { reject(new Error('รูปแบบข้อมูลไม่ถูกต้อง')); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res, kind) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'รองรับเฉพาะ POST กรุณาใช้วิธีล็อกอินผ่านเว็บ Riot แล้วส่ง URL' });
  }
  try {
    const body = await readBody(req);
    const shard = String(body.shard || 'ap').toLowerCase();
    if (!['ap', 'na', 'eu', 'kr'].includes(shard)) return send(res, 400, { error: 'Region ไม่ถูกต้อง' });
    const url = String(body.url || '');
    if (url.length > 12000 || !url.includes('access_token=')) {
      return send(res, 400, { error: 'ไม่พบ access_token ใน URL กรุณาล็อกอิน Riot แล้ววาง URL เต็มที่มี #access_token=...' });
    }
    const fn = kind === 'store' ? store : inv;
    const result = await fromUrl(shard, url, fn);
    return send(res, 200, result);
  } catch (err) {
    // Do not log the submitted URL or tokens.
    return send(res, 400, { error: err && err.message ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Riot' });
  }
};
