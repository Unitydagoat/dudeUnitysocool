const WEBHOOK_URL = "https://discord.com/api/webhooks/1554231951261438002/UPKhy2f3a9tuzKxCZvhGDtR2SBhhx6jlQiSBRzykMAyI8e0ajjKdV4lGV3QtcJourdvB";

function buildEmbed(data) {
  return {
    embeds: [{
      title: "Entitlement Check Failed",
      color: 0xFF0000,
      fields: [
        { name: "Oculus ID", value: data.OculusId || "N/A", inline: true },
        { name: "Error Code", value: String(data.errorCode), inline: true },
        { name: "Error Message", value: data.ErrorMessage || "N/A", inline: false },
        { name: "Platform", value: data.Platform || "N/A", inline: true },
        { name: "Package Name", value: data.PackageName || "N/A", inline: true },
        { name: "Device Model", value: data.DeviceModel || "N/A", inline: true },
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
<head><title>Entitlement API</title></head>
<body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0">
  <h1>Entitlement Check API</h1>
  <p>Send POST requests to this endpoint with entitlement failure data.</p>
  <button onclick="sendTest()" style="padding:12px 24px;font-size:16px;background:#E74C3C;color:#fff;border:none;border-radius:8px;cursor:pointer">
    Send Test Webhook
  </button>
  <p id="status"></p>
  <script>
    async function sendTest() {
      document.getElementById('status').textContent = 'Sending...';
      const res = await fetch('/api?test=1', { method: 'POST' });
      const data = await res.json();
      document.getElementById('status').textContent = 'Sent! Check Discord.';
    }
  </script>
</body>
</html>`;
    return res.status(200).send(html);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "no get requests boi, use POST" });
  }

  const { OculusId, errorCode, ErrorMessage, Platform, PackageName, DeviceModel } = req.body;

  console.log("[ENTITLEMENT FAIL]", {
    OculusId,
    errorCode,
    ErrorMessage,
    Platform,
    PackageName,
    DeviceModel,
    timestamp: new Date().toISOString(),
  });

  await sendWebhook(buildEmbed({ OculusId, errorCode, ErrorMessage, Platform, PackageName, DeviceModel }));

  return res.status(200).json({ received: true });
}
