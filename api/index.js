const webhookdude = "https://discord.com/api/webhooks/1554231951261438002/UPKhy2f3a9tuzKxCZvhGDtR2SBhhx6jlQiSBRzykMAyI8e0ajjKdV4lGV3QtcJourdvB";

export default async function handler(req, res) {
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

  const embed = {
    embeds: [{
      title: "Entitlement Check Failed",
      color: 0xFF0000,
      fields: [
        { name: "Oculus ID", value: OculusId || "N/A", inline: true },
        { name: "Error Code", value: String(errorCode), inline: true },
        { name: "Error Message", value: ErrorMessage || "N/A", inline: false },
        { name: "Platform", value: Platform || "N/A", inline: true },
        { name: "Package Name", value: PackageName || "N/A", inline: true },
        { name: "Device Model", value: DeviceModel || "N/A", inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "GUBBA TAG Auth" }
    }]
  };

  try {
    await fetch(webhookdude, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embed),
    });
  } catch (e) {
    console.error("[shucks dude]", e.message);
  }

  return res.status(200).json({ received: true });
}
