import crypto from "crypto";

const WEBHOOK_URL = "https://discord.com/api/webhooks/1561451386653122701/HH7oNRue9t2e22o0aYfySDE24TomkVXUfqQ0q6uDXhe6EtD11to8l9MXST3VlDRIJkIy";
const TITLE_ID = "1A8FBB";
const SECRET_KEY = process.env.PLAYFAB_SECRET_KEY || "3R89SCP5R1ZHHAJHFMQXKSAXYA8UBYN5ZGWC8GGAOZFIXUC6JK";
const PHOTON_APP_ID = "58470cc4-2d65-42d3-b822-44a73939fdd1";
const PHOTON_APP_SECRET = process.env.PHOTON_APP_SECRET || "SPADSOWONHGSB48NZGG4ZAR4YRNPMGFWZ4DQMYPDX3XPUU3HHK"; 
const TOKEN_EXPIRY_SECONDS = 3600;
const VALID_PLATFORM = "Quest";

const RATE_LIMIT_STORE = {};
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQ = 15;

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

function generatePhotonToken(userId, appId, platform, appVersion) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    user_id: String(userId),
    app_id: String(appId),
    app_version: String(appVersion),
    platform: String(platform),
    auth_time: now,
    expiry: now + TOKEN_EXPIRY_SECONDS,
  };
  
  const payloadJson = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', PHOTON_APP_SECRET).update(payloadJson).digest('hex');
  const encodedPayload = Buffer.from(payloadJson).toString('base64');
  
  return `${encodedPayload}.${signature}`;
}

function buildFailureEmbed(failures, info) {
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
      title: "Entitlement Check Failed - Photon Denied",
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
      title: "Playfab Auth Success - Photon Token Issued",
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

function rateLimit(req, res) {
  const ip = (req.headers["x-forwarded-for"]?.split(",")[0] || req.connection?.remoteAddress || "unknown").trim();
  const now = Date.now();
  
  if (!RATE_LIMIT_STORE[ip]) {
    RATE_LIMIT_STORE[ip] = [];
  }
  
  RATE_LIMIT_STORE[ip] = RATE_LIMIT_STORE[ip].filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (RATE_LIMIT_STORE[ip].length >= RATE_LIMIT_MAX_REQ) {
    return { limited: true, ip };
  }
  
  RATE_LIMIT_STORE[ip].push(now);
  return { limited: false, ip };
}

export default async function handler(req, res) {
  const { limited, ip } = rateLimit(req, res);
  
  if (limited) {
    return res.status(429).json({ result: "error", error: "rate_limited" });
  }

  if (req.method === "GET") {
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const {
    AppId,
    PlayFabId,
    Platform,
    PackageName,
    DeviceModel,
    AppVersion,
    UserId,
    customId,
    nonce,
    deviceIdentifier,
    gameVersion,
    metaUserId,
    metaUsername,
    metaOrgScopedId,
    photonToken 
  } = req.body || {};
  if (!AppId) {
    return res.status(400).json({ result: "error", error: "missing_app_id" });
  }

  if (AppId !== PHOTON_APP_ID) {
    return res.status(401).json({ result: "error", error: "invalid_auth" });
  }

  if (Platform !== VALID_PLATFORM) {
    return res.status(400).json({ result: "error", error: "unsupported_platform" });
  }
  if (!PlayFabId) {
    return res.status(400).json({ result: "error", error: "missing_playfab_id" });
  }

  const results = await Promise.all([
    checkPlayFabBan(PlayFabId),
    checkTitleData(),
    checkInventory(PlayFabId),
    checkUserData(PlayFabId),
    checkCloudScript(),
  ]);

  const failures = results.filter(r => !r.passed);

  if (failures.length > 0) {
    await sendWebhook(buildFailureEmbed(failures, { ...req.body, ip }));
    return res.status(403).json({ 
      result: "error", 
      error: "entitlement_check_failed", 
      failures: failures.length 
    });
  }
  const finalUserId = UserId || PlayFabId || `quest_anon_${Math.floor(Date.now() / 1000)}_${ip}`;
  let finalPhotonToken = photonToken;

  if (!finalPhotonToken) {
    try {
      finalPhotonToken = generatePhotonToken(finalUserId, AppId, Platform, AppVersion || "1.0");
    } catch (e) {
      return res.status(500).json({ result: "error", error: "token_generation_failed" });
    }
  }
  await sendWebhook(buildSuccessEmbed({ 
    ...req.body, 
    PlayFabId, 
    Platform, 
    PackageName, 
    DeviceModel, 
    photonToken: finalPhotonToken, 
    customId, 
    nonce, 
    deviceIdentifier, 
    gameVersion, 
    metaUserId, 
    metaUsername, 
    metaOrgScopedId, 
    ip 
  }));
  return res.status(200).json({ 
    result: "ok", 
    token: finalPhotonToken, 
    user_id: finalUserId, 
    expires_at: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS 
  });
}
