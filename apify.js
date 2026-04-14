export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { keyword, country, limit, token } = req.query;
  const APIFY_TOKEN = token || process.env.APIFY_TOKEN || 'apify_api_ndYUy4zfhh1WtM8E7aMY5J9pDlMW773s4Vut';
  const maxItems = parseInt(limit) || 24;
  const countryCode = (country || 'US').toUpperCase();

  // Build Facebook Ad Library search URL
  const fbUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${countryCode}&q=${encodeURIComponent(keyword)}&search_type=keyword_unordered&media_type=all`;

  try {
    // Start Apify actor run
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-ads-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: fbUrl }],
          maxItems: maxItems,
          activeStatus: 'ACTIVE',
        })
      }
    );

    if (!runRes.ok) {
      const err = await runRes.text();
      return res.status(500).json({ error: `Apify run failed: ${err}` });
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;
    if (!runId) return res.status(500).json({ error: 'No run ID returned from Apify' });

    // Poll for completion (max 60 seconds)
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;

      const statusRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusRes.json();
      const status = statusData.data?.status;

      if (status === 'SUCCEEDED') {
        // Fetch results from dataset
        const datasetId = statusData.data?.defaultDatasetId;
        const itemsRes = await fetch(
          `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=${maxItems}&format=json`
        );
        const items = await itemsRes.json();
        return res.status(200).json({ success: true, data: items, count: items.length });
      }

      if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        return res.status(500).json({ error: `Apify run ${status}` });
      }
    }

    return res.status(504).json({ error: 'Apify run timed out after 60 seconds' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
