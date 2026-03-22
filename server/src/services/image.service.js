const sharp = require('sharp');
const logger = require('../utils/logger');
const { IMAGE_CONFIG } = require('../config/constants');

async function optimize(inputPath, outputPath) {
  let pipeline = sharp(inputPath)
    .resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: IMAGE_CONFIG.quality });

  await pipeline.toFile(outputPath);

  const metadata = await sharp(outputPath).metadata();
  const stats = await sharp(outputPath).toBuffer();

  if (stats.length > IMAGE_CONFIG.maxSize) {
    const reducedQuality = Math.floor(IMAGE_CONFIG.quality * (IMAGE_CONFIG.maxSize / stats.length));
    await sharp(inputPath)
      .resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: Math.max(reducedQuality, 30) })
      .toFile(outputPath);
  }

  const finalBuffer = await sharp(outputPath).toBuffer();
  const finalMeta = await sharp(outputPath).metadata();

  logger.info(`Image optimized: ${inputPath} -> ${outputPath} (${finalBuffer.length} bytes)`);

  return {
    outputPath,
    size: finalBuffer.length,
    width: finalMeta.width,
    height: finalMeta.height,
  };
}

async function getImageBuffer(inputPath) {
  return sharp(inputPath)
    .resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: IMAGE_CONFIG.quality })
    .toBuffer();
}

module.exports = { optimize, getImageBuffer };
