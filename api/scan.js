const UA = "Mozilla/5.0 (compatible; SpikeScan/1.0)";
const SCREENERS = ["most_actives", "small_cap_gainers", "aggressive_small_caps", "day_gainers"];
function screenerUrl(id) {
  return "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=US&scrIds=" + id + "&count=50";
}
function searchUrl(symbol) {
  return "https://query1.finance.yahoo.com/v1/finance/search?q=" + encodeURIComponent(symbol) + "&newsCount=6&quotesCount=1";
}
async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(res.status + " " + url);
  return res.json();
}
function keywords(title) {
  const t = (title || "").toLowerCase();
  const hits = [];
  [["acquire", "M&A"], ["merger", "M&A"], ["13g", "13G"], ["shareholder", "Holder"], ["insider", "Insider"], ["fda", "FDA"], ["contract", "Contract"], ["earnings", "Earnings"], ["partnership", "Partnership"], ["offering", "Dilution risk"]].forEach(([k, label]) => { if (t.includes(k)) hits.push(label); });
  return [...new Set(hits)];
}
function scoreName(q, news) {
  const px = q.regularMarketPrice || 0;
  const chg = q.regularMarketChangePercent || 0;
  const vol = q.regularMarketVolume || 0;
  const cap = q.marketCap || 0;
  const volPts = Math.min(28, Math.log10(Math.max(vol, 1)) * 4.2);
  const movePts = Math.min(24, Math.abs(chg) * 1.15) + (chg > 0 ? 6 : 0);
  const pennyPts = px <= 1 ? 14 : px <= 2 ? 10 : px <= 5 ? 7 : 0;
  const capPts = cap && cap < 3e8 ? 10 : cap && cap < 1e9 ? 6 : 3;
  const heads = news || [];
  const tags = heads.flatMap((n) => keywords(n.title));
  const newsPts = Math.min(18, heads.length * 3 + tags.length * 2);
  return { score: Math.round(Math.min(99, volPts + movePts + pennyPts + capPts + newsPts)), tags: [...new Set(tags)] };
}
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=300");
  try {
    const batches = await Promise.allSettled(SCREENERS.map((id) => getJson(screenerUrl(id))));
    const bySym = new Map();
    for (const b of batches) {
      if (b.status !== "fulfilled") continue;
      const quotes = (b.value && b.value.finance && b.value.finance.result && b.value.finance.result[0] && b.value.finance.result[0].quotes) || [];
      for (const q of quotes) {
        if (!q || !q.symbol) continue;
        if ((q.quoteType || "EQUITY") !== "EQUITY") continue;
        const px = q.regularMarketPrice;
        if (px == null || px <= 0 || px > 5) continue;
        if (!bySym.has(q.symbol) || (q.regularMarketVolume || 0) > (bySym.get(q.symbol).regularMarketVolume || 0)) bySym.set(q.symbol, q);
      }
    }
    const universe = [...bySym.values()].sort((a, b) => (b.regularMarketVolume || 0) - (a.regularMarketVolume || 0));
    const focus = universe.slice(0, 18);
    const newsMap = {};
    await Promise.all(focus.map(async (q) => {
      try {
        const s = await getJson(searchUrl(q.symbol));
        newsMap[q.symbol] = (s.news || []).slice(0, 5).map((n) => ({ title: n.title, source: n.publisher, url: n.link, time: n.providerPublishTime }));
      } catch (e) { newsMap[q.symbol] = []; }
    }));
    const results = focus.map((q) => {
      const news = newsMap[q.symbol] || [];
      const scored = scoreName(q, news);
      return { ticker: q.symbol, name: q.shortName || q.longName || q.symbol, exchange: q.fullExchangeName || q.exchange, price: q.regularMarketPrice, change: q.regularMarketChangePercent || 0, volume: q.regularMarketVolume || 0, avgVol: q.averageDailyVolume3Month || 0, mktCap: q.marketCap || 0, score: scored.score, tags: scored.tags, news };
    }).sort((a, b) => b.score - a.score);
    res.status(200).json({ asOf: new Date().toISOString(), scanned: universe.length, source: "Yahoo Finance public screeners + news search", results });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}
