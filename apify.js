export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { keyword, country, limit } = req.query;
  const APIFY_TOKEN = 'apify_api_ndYUy4zfhh1WtM8E7aMY5J9pDlMW773s4Vut';
  const maxItems = parseInt(limit) || 24;
  const countryCode = (country || 'US').toUpperCase();

  const fbUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${countryCode}&q=${encodeURIComponent(keyword)}&search_type=keyword_unordered&media_type=all`;

  try {
    // Use synchronous run endpoint — returns results directly, no polling needed
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-ads-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&format=json&limit=${maxItems}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: fbUrl }],
          maxItems: maxItems,
          proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] },
        })
      }
    );

    if (!runRes.ok) {
      const errText = await runRes.text();
      let errMsg = errText;
      try { errMsg = JSON.parse(errText)?.error?.message || errText; } catch(e) {}
      return res.status(500).json({ error: `Apify error: ${errMsg}` });
    }

    const items = await runRes.json();
    return res.status(200).json({
      success: true,
      data: Array.isArray(items) ? items : [],
      count: Array.isArray(items) ? items.length : 0
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
