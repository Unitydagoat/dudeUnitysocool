const axios = require("axios");

const WEBHOOK_URL = process.env.WEBHOOK_URL;

function buildEmbed(data) {
  return {
    embeds: [{
      title: "Entitlement Check Failed",
      color: 0xFF0000,
      fields: [
        {
          name: "Oculus ID",
          value: String(data.OculusId || "N/A"),
          inline: true
        },
        {
          name: "Error Code",
          value: String(data.errorCode ?? "N/A"),
          inline: true
        },
        {
          name: "Error Message",
          value: String(data.ErrorMessage || "N/A").slice(0, 1024),
          inline: false
        },
        {
          name: "Platform",
          value: String(data.Platform || "N/A"),
          inline: true
        },
        {
          name: "Package Name",
          value: String(data.PackageName || "N/A"),
          inline: true
        },
        {
          name: "Device Model",
          value: String(data.DeviceModel || "N/A"),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "unity so hot"
      }
    }]
  };
}

async function sendWebhook(payload) {
  try {
    const response = await axios.post(
      WEBHOOK_URL,
      payload,
      {
        timeout: 10000,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("[WEBHOOK] Sent successfully:", response.status);

    return {
      success: true,
      status: response.status
    };
  } catch (error) {
    console.error(
      "[WEBHOOK ERROR]",
      error.response?.status,
      error.response?.data || error.message
    );

    return {
      success: false,
      status: error.response?.status || 500,
      error: error.response?.data || error.message
    };
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Entitlement API</title>
</head>

<body style="
  background:#1a1a2e;
  color:#fff;
  font-family:sans-serif;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  height:100vh;
  margin:0
">

  <h1>Entitlement Check API</h1>

  <p>Send POST requests to this endpoint with entitlement failure data.</p>

  <button
    onclick="sendTest()"
    style="
      padding:12px 24px;
      font-size:16px;
      background:#E74C3C;
      color:#fff;
      border:none;
      border-radius:8px;
      cursor:pointer
    "
  >
    Send Test Webhook
  </button>

  <p id="status"></p>

  <script>
    async function sendTest() {
      const status = document.getElementById("status");

      status.textContent = "Sending...";

      try {
        const response = await fetch("/api", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            OculusId: "TEST_OCULUS_ID",
            errorCode: 1234,
            ErrorMessage: "Test entitlement failure",
            Platform: "Quest",
            PackageName: "com.example.test",
            DeviceModel: "Meta Quest"
          })
        });

        const data = await response.json();

        if (response.ok && data.webhookSent) {
          status.textContent = "Webhook sent!";
        } else {
          status.textContent =
            "Webhook failed: " + (data.error || "Unknown error");

          console.error(data);
        }
      } catch (error) {
        status.textContent = "Request failed: " + error.message;
        console.error(error);
      }
    }
  </script>

</body>
</html>`;

    return res.status(200).send(html);
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Use POST"
    });
  }

  if (!WEBHOOK_URL) {
    console.error("[WEBHOOK] WEBHOOK_URL is not configured");

    return res.status(500).json({
      received: false,
      webhookSent: false,
      error: "WEBHOOK_URL is not configured"
    });
  }

  const {
    OculusId,
    errorCode,
    ErrorMessage,
    Platform,
    PackageName,
    DeviceModel
  } = req.body || {};

  console.log("[ENTITLEMENT FAIL]", {
    OculusId,
    errorCode,
    ErrorMessage,
    Platform,
    PackageName,
    DeviceModel,
    timestamp: new Date().toISOString()
  });

  const payload = buildEmbed({
    OculusId,
    errorCode,
    ErrorMessage,
    Platform,
    PackageName,
    DeviceModel
  });

  await sendWebhook(payload);
};
