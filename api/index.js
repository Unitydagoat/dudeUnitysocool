import crypto from "crypto";

const WEBHOOK_URL = "https://discord.com/api/webhooks/1555046191677313067/EhIfWEzXdH1UiWi2Sk1mB6fX5yci7xUYXTXvcj48Q7tXGlSR7jSxF_Uan28h_SJeoza-";

const TITLE_ID = "116C19";
const SECRET_KEY = process.env.PLAYFAB_SECRET_KEY || "FN87SC9HGNFQD93THWQ9YARI7DF4CFPU6XUKJ51JHI4GSSGBEO";
const PHOTON_APP_ID = "d367d3f3-d294-4eef-8b35-3d0722fab130";
const PHOTON_APP_SECRET = process.env.PHOTON_APP_SECRET || "HKXBPIAUAAZ9NBC3JYFUCGF6OFJE9Z85GPF7HYMBRAXHNSOMT9";

async function playFabPost(path, body = {}) {
  const url = `https://${TITLE_ID}.playfabapi.com/Admin/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SecretKey": SECRET_KEY,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}
function decodeBase64Url(str) {
  try {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function verifyPhotonToken(token) {
  if (!token || typeof token !== "string") {
    return { valid: false, detail: "Missing or malformed token" };
  }

  const parts = token.split(".");
  let payload = null;
  let signed = false;

  if (parts.length === 3) {
    payload = decodeBase64Url(parts[1]);
    if (PHOTON_APP_SECRET) {
      const expected = crypto
        .createHmac("sha256", PHOTON_APP_SECRET)
        .update(`${parts[0]}.${parts[1]}`)
        .digest("base64url");
      if (expected === parts[2]) signed = true;
      else return { valid: false, detail: "Signature mismatch" };
    }
  } else {
    payload = decodeBase64Url(token);
  }

  if (!payload) {
    return { valid: false, detail: "Token is not valid base64" };
  }

  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    return { valid: false, detail: "Token payload is not valid JSON" };
  }

  const exp = data.exp ?? data.expiration ?? data.expires ?? data.ExpirationTime;
  if (exp !== undefined && exp !== null) {
    const expMs = exp > 1e12 ? exp : exp * 1000;
    if (Date.now() > expMs) {
      return { valid: false, detail: "Token expired" };
    }
  }

  const userId = data.userId ?? data.UserId ?? data.playfabId ?? data.PlayFabId ?? null;

  return {
    valid: true,
    userId,
    expiresAt: exp ? new Date(exp > 1e12 ? exp : exp * 1000).toISOString() : null,
  };
}

async function checkPhotonAuth(playFabId, token) {
  try {
    if (!token) {
      return { check: "photon_verify", passed: false, detail: "No token provided in request body" };
    }
    const result = verifyPhotonToken(token);
    if (!result.valid) {
      return { check: "photon_verify", passed: false, detail: result.detail };
    }
    if (playFabId && result.userId && result.userId !== playFabId) {
      return { check: "photon_verify", passed: false, detail: "Token userId does not match PlayFabId" };
    }
    return { check: "photon_verify", passed: true, detail: `Token valid${result.expiresAt ? `, expires ${result.expiresAt}` : ""}` };
  } catch (e) {
    return { check: "photon_verify", passed: false, detail: e.message };
  }
}
async function checkPlayFabBan(playFabId) {
  try {
    const data = await playFabPost("GetUserBans", { PlayFabId: playFabId });
    if (data.data?.BanData?.length > 0) {
      return { check: "playfab_ban", passed: false, detail: `Active bans: ${data.data.BanData.length}` };
    }
    return { check: "playfab_ban", passed: true };
  } catch (e) {
    return { check: "playfab_ban", passed: false, detail: e.message };
  }
}

async function checkPhotonToken(playFabId) {
  try {
    const data = await playFabPost("GetPhotonAuthenticationToken", { PhotonApplicationId: PHOTON_APP_ID });
    if (!data.data?.PhotonCustomAuthenticationToken) {
      return { check: "photon_token", passed: false, detail: "No token returned" };
    }
    return { check: "photon_token", passed: true };
  } catch (e) {
    return { check: "photon_token", passed: false, detail: e.message };
  }
}

async function checkTitleData() {
  try {
    const data = await playFabPost("GetTitleData", {});
    if (!data.data?.Data || Object.keys(data.data.Data).length === 0) {
      return { check: "title_data", passed: false, detail: "Title data empty" };
    }
    return { check: "title_data", passed: true };
  } catch (e) {
    return { check: "title_data", passed: false, detail: e.message };
  }
}

async function checkPlayerStats(playFabId) {
  try {
    const data = await playFabPost("GetPlayerStatistics", { PlayFabId: playFabId });
    if (!data.data?.Statistics) {
      return { check: "player_stats", passed: false, detail: "No stats found" };
    }
    return { check: "player_stats", passed: true };
  } catch (e) {
    return { check: "player_stats", passed: false, detail: e.message };
  }
}

async function checkInventory(playFabId) {
  try {
    const data = await playFabPost("GetUserInventory", { PlayFabId: playFabId });
    if (!data.data) {
      return { check: "inventory", passed: false, detail: "No inventory data" };
    }
    return { check: "inventory", passed: true };
  } catch (e) {
    return { check: "inventory", passed: false, detail: e.message };
  }
}

async function checkUserData(playFabId) {
  try {
    const data = await playFabPost("GetUserData", { PlayFabId: playFabId });
    if (!data.data?.Data) {
      return { check: "user_data", passed: false, detail: "No user data" };
    }
    return { check: "user_data", passed: true };
  } catch (e) {
    return { check: "user_data", passed: false, detail: e.message };
  }
}

async function checkCloudScript() {
  try {
    const data = await playFabPost("GetCloudScriptVersions", {});
    if (!data.data?.Versions || data.data.Versions.length === 0) {
      return { check: "cloudscript", passed: false, detail: "No versions found" };
    }
    return { check: "cloudscript", passed: true };
  } catch (e) {
    return { check: "cloudscript", passed: false, detail: e.message };
  }
}

function buildEmbed(failures, info) {
  const fields = [
    { name: "PlayFab ID", value: info.PlayFabId || "N/A", inline: true },
    { name: "Title ID", value: TITLE_ID, inline: true },
    { name: "Platform", value: info.Platform || "N/A", inline: true },
    { name: "Package Name", value: info.PackageName || "N/A", inline: true },
    { name: "Device Model", value: info.DeviceModel || "N/A", inline: true },
    { name: "Timestamp", value: new Date().toISOString(), inline: false },
  ];

  for (const f of failures) {
    fields.push({ name: f.check, value: f.detail, inline: false });
  }

  return {
    embeds: [{
      title: "Entitlement Check Failed",
      color: 0xFF0000,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: "unity so hot" }
    }]
  };
}

async function sendWebhook(payload) {
  try {
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[shucks dude]", e.message);
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const html = `<!DOCTYPE html>
<html>
<head><title>Unitys so hot and saxy</title></head>
<body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
  <h1>api shi</h1>
  <p>Send POST with PlayFabId (and optional token) to run all checks.</p>
  <button onclick="sendTest()" style="padding:12px 24px;font-size:16px;background:#E74C3C;color:#fff;border:none;border-radius:8px;cursor:pointer">
    Run Test Check
  </button>
  <p id="status"></p>
  <script>
    async function sendTest() {
      document.getElementById('status').textContent = 'Running checks...';
      const res = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          PlayFabId: "A33437C916F6B6F7",
          Platform: "Quest",
          PackageName: "com.gubbatag",
          DeviceModel: "Meta Quest 3"
        })
      });
      const data = await res.json();
      document.getElementById('status').textContent = data.failures?.length + ' failures found';
    }
  </script>
</body>
</html>`;
    return res.status(200).send(html);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { PlayFabId, Platform, PackageName, DeviceModel, token } = req.body || {};

  if (!PlayFabId) {
    return res.status(400).json({ error: "PlayFabId required" });
  }

  const checks = [
    checkPlayFabBan(PlayFabId),
    checkPhotonToken(PlayFabId),
    checkTitleData(),
    checkPlayerStats(PlayFabId),
    checkInventory(PlayFabId),
    checkUserData(PlayFabId),
    checkCloudScript(),
  ];

  if (token) {
    checks.push(checkPhotonAuth(PlayFabId, token));
  }

  const results = await Promise.all(checks);

  const failures = results.filter(r => !r.passed);

  if (failures.length > 0) {
    await sendWebhook(buildEmbed(failures, req.body));
  }

  return res.status(200).json({ received: true, failures: failures.length, results });
}
