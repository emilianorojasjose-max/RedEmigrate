// Achica la foto en el navegador antes de subirla (cuadrada, máx. 512 px, JPEG).
export async function resizeSquare(file, size = 512, quality = 0.86) {
  if (!file.type.startsWith("image/")) throw new Error("archivo_no_es_imagen");
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(size, s);
  canvas.getContext("2d").drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("no_se_pudo_procesar"))), "image/jpeg", quality));
}

// Sube la foto al bucket público "avatars" dentro de la carpeta de la persona y devuelve la URL pública.
export async function uploadAvatar(sb, uid, file) {
  const blob = await resizeSquare(file);
  const path = `${uid}/avatar-${Date.now()}.jpg`;
  const { error } = await sb.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return sb.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
