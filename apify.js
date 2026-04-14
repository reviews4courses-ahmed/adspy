// Step 1: Just start the Apify run and return the run ID immediately
// Frontend will poll Apify directly for results (avoids Vercel 10s timeout)
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
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-ads-scraper/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: fbUrl }],
          maxItems: maxItems,
        })
      }
    );

    const runData = await runRes.json();
    if (!runRes.ok || runData.error) {
      return res.status(500).json({ error: runData.error?.message || 'Failed to start Apify run' });
    }

    // Return run ID and token so frontend can poll directly
    return res.status(200).json({
      runId: runData.data?.id,
      datasetId: runData.data?.defaultDatasetId,
      token: APIFY_TOKEN,
      status: runData.data?.status
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
