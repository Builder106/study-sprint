import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const [url, outputDirectory] = process.argv.slice(2);
if (!url || !outputDirectory) {
  throw new Error('Usage: node design/capture-charge-poster.mjs <url> <output-directory>');
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
});

try {
  for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript((chosenTheme) => {
      localStorage.setItem('theme', chosenTheme);
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options) {
        if (type === 'webgl' || type === 'webgl2') {
          return getContext.call(this, type, { ...options, preserveDrawingBuffer: true });
        }
        return getContext.call(this, type, options);
      };
    }, theme);
    const page = await context.newPage();
    await page.goto(url);
    await page.locator('.ss-object[data-renderer="ready"]').waitFor();
    const dataUrl = await page.locator('.ss-canvas canvas').evaluate((canvas) =>
      canvas.toDataURL('image/webp', 0.92)
    );
    if (!dataUrl.startsWith('data:image/webp;base64,')) {
      throw new Error(`Could not capture the ${theme} canvas as WebP`);
    }
    const path = `${outputDirectory}/charge-sculpture-${theme}.webp`;
    await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log(path);
    await context.close();
  }
} finally {
  await browser.close();
}
