// lib/imagekit.ts
import ImageKit from "imagekit-javascript";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!, // ej. https://ik.imagekit.io/tu_id
});

export default imagekit;
