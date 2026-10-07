import crypto from "crypto";

const WEBHOOK_URL = "https://discord.com/api/webhooks/1555046191677313067/EhIfWEzXdH1UiWi2Sk1mB6fX5yci7xUYXTXvcj48Q7tXGlSR7jSxF_Uan28h_SJeoza-";

const TITLE_ID = "116C19";
const SECRET_KEY = process.env.PLAYFAB_SECRET_KEY || "FN87SC9HGNFQD93THWQ9YARI7DF4CFPU6XUKJ51JHI4GSSGBEO";
const PHOTON_APP_ID = "d367d3f3-d294-4eef-8b35-3d0722fab130";

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

function buildSuccessEmbed(info) {
  return {
    embeds: [{
      title: "Playfab Auth Success yipi",
      color: 0x00FF00,
      fields: [
        { name: "[CUSTOM ID]:", value: info.customId || "N/A" },
        { name: "[PLAYFAB ID]:", value: info.PlayFabId || "N/A" },
        { name: "[NONCE]:", value: info.nonce || "N/A" },
        { name: "[DEVICE IDENTIFIER]:", value: info.deviceIdentifier || "N/A" },
        { name: "[GAME VERSION]:", value: info.gameVersion || "N/A" },
        { name: "Meta Info", value: `[USER ID]: ${info.metaUserId || "N/A"}\n[USERNAME]: ${info.metaUsername || "N/A"}\n[ORG SCOPED ID]: ${info.metaOrgScopedId || "N/A"}` },
        { name: "Ip", value: info.ip || "N/A" },
        { name: "Photon Token", value: info.photonToken ? `\`\`\`${info.photonToken}\`\`\`` : "N/A" },
        { name: "Platform", value: info.Platform || "N/A" },
        { name: "Package Name", value: info.PackageName || "N/A" },
        { name: "Device Model", value: info.DeviceModel || "N/A" },
        { name: "Timestamp", value: new Date().toISOString() },
      ],
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
  <p>Send POST with PlayFabId to run all checks.</p>
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
          DeviceModel: "Meta Quest 3",
          photonToken: "789f7dg89dfg7df89g6778fdg6789d",
          customId: "SMALLKITTYPLAYER0EhsT405LOLjMgUD4kEJAcE5LVk1YHKi6o",
          nonce: "mWiYM1Febv197suJSKTG4JQtxo0Kv0ZLkqoKaoejulMABOxEDeyZQ18o",
          deviceIdentifier: "2c22b500c04f1074",
          gameVersion: "ProjectDarkV3",
          metaUserId: "2803575791272924",
          metaUsername: "error",
          metaOrgScopedId: "error"
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

  const {
    PlayFabId,
    Platform,
    PackageName,
    DeviceModel,
    photonToken,
    OculusId,
    errorCode,
    ErrorMessage,
    customId,
    nonce,
    deviceIdentifier,
    gameVersion,
    metaUserId,
    metaUsername,
    metaOrgScopedId,
  } = req.body || {};

  if (!PlayFabId) {
    return res.status(400).json({ error: "PlayFabId required" });
  }

  const ip = (req.headers["x-forwarded-for"]?.split(",")[0] || req.connection?.remoteAddress || "N/A").trim();

  const results = await Promise.all([
    checkPlayFabBan(PlayFabId),
    checkTitleData(),
    checkInventory(PlayFabId),
    checkUserData(PlayFabId),
    checkCloudScript(),
  ]);

  const failures = results.filter(r => !r.passed);

  if (failures.length > 0) {
    await sendWebhook(buildEmbed(failures, { ...req.body, customId, nonce, deviceIdentifier, gameVersion, metaUserId, metaUsername, metaOrgScopedId, ip }));
  } else {
    await sendWebhook(buildSuccessEmbed({ PlayFabId, Platform, PackageName, DeviceModel, photonToken, OculusId, errorCode, ErrorMessage, customId, nonce, deviceIdentifier, gameVersion, metaUserId, metaUsername, metaOrgScopedId, ip }));
  }

  return res.status(200).json({ received: true, failures: failures.length, results });
}
