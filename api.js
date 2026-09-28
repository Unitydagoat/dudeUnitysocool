export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { OculusId, ErrorCode, ErrorMessage, Platform, PackageName, DeviceModel } = req.body;

  console.log("[ENTITLEMENT FAIL]", {
    OculusId,
    errorCode,
    ErrorMessage,
    Platform,
    PackageName,
    DeviceModel,
    timestamp: new Date().toISOString(),
  });

  return res.status(200).json({ received: true });
}
