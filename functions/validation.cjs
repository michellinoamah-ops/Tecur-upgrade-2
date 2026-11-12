function validate(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) throw Error("Invalid request.");
  if (d.website) throw Error("Invalid request.");
  if (d.consent !== true) throw Error("Consent is required.");
  for (const [k, min, max] of [
    ["name", 1, 100],
    ["phone", 7, 25],
    ["summary", 10, 3000],
    ["requestId", 16, 80],
  ]) {
    if (typeof d[k] !== "string" || d[k].trim().length < min || d[k].length > max)
      throw Error("Invalid " + k + ".");
  }
  if (!/^[+\d\s()-]+$/.test(d.phone) || !/^[a-zA-Z0-9-]+$/.test(d.requestId))
    throw Error("Invalid contact or request identifier.");
  return { name: d.name.trim(), phone: d.phone.trim(), summary: d.summary.trim() };
}
module.exports = { validate };
function location(p) {
  if (p == null) return null;
  if (
    typeof p !== "object" ||
    !Number.isFinite(p.lat) ||
    !Number.isFinite(p.lng) ||
    Math.abs(p.lat) > 90 ||
    Math.abs(p.lng) > 180 ||
    !Number.isFinite(p.accuracy) ||
    p.accuracy < 0 ||
    p.accuracy > 100000
  )
    throw Error("Invalid location.");
  return {
    lat: p.lat,
    lng: p.lng,
    accuracy: Math.round(p.accuracy),
    capturedAt: new Date().toISOString(),
  };
}
function photos(list = []) {
  if (!Array.isArray(list) || list.length > 3) throw Error("Maximum 3 photos.");
  return list.map((p) => {
    if (
      !p ||
      typeof p.data !== "string" ||
      p.data.length > 500000 ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(p.data)
    )
      throw Error("Invalid photo.");
    const bytes = Buffer.from(p.data.split(",")[1], "base64");
    if (
      bytes.length < 4 ||
      bytes[0] !== 255 ||
      bytes[1] !== 216 ||
      bytes[2] !== 255 ||
      bytes[bytes.length - 2] !== 255 ||
      bytes[bytes.length - 1] !== 217
    )
      throw Error("Invalid JPEG.");
    return bytes;
  });
}
module.exports.location = location;
module.exports.photos = photos;
