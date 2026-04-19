export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { image, mediaType } = req.body;
  if (!image) return res.status(400).json({ error: "Image required" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 800,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: `You are a wine label reader. Examine this wine bottle label carefully and extract all information you can see.

Return ONLY a JSON object with these exact fields (use null for anything not visible):
{
  "producer": "the winery or producer name",
  "cuvee": "the wine name or cuvee (not the producer)",
  "vintage": 2018,
  "region": "e.g. Bordeaux – Left Bank or California – Cabernet",
  "appellation": "e.g. Pauillac or Napa Valley",
  "varietal": "e.g. Cabernet Sauvignon or Malbec",
  "score": null,
  "value": null,
  "drink_from": null,
  "drink_to": null,
  "peak_year": null,
  "zone": "A",
  "size": "750ml",
  "qty": 1
}

Zone guide: A=long-aging Bordeaux/Napa Cab, B=Italian/Rhone, C=Pinot Noir, D=everyday, Bin=bulk, Display=special.
Use your wine knowledge to fill in score, value, drink window, and peak year if you know them.
Return ONLY valid JSON, no markdown, no explanation.`
            }
          ]
        }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic error:", JSON.stringify(data));
      return res.status(500).json({ error: data?.error?.message, wine: {} });
    }

    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    const wine = JSON.parse(clean);

    return res.status(200).json({ wine });

  } catch (err) {
    console.error("Scan error:", err.message);
    return res.status(500).json({ error: err.message, wine: {} });
  }
}
