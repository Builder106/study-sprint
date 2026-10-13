import { type ConsoleMessage, expect, test as playwrightTest } from '@playwright/test';

const REDUCED_MOTION_ADVISORY =
  'You have Reduced Motion enabled on your device. Animations may not appear as expected.. For more information and steps for solving, visit https://motion.dev/troubleshooting/reduced-motion-disabled';
const WEBGL_READBACK_ADVISORY =
  /^\[\.WebGL-0x[\da-f]+\]GL Driver Message \(OpenGL, Performance, GL_CLOSE_PATH_NV, High\): GPU stall due to ReadPixels(?: \(this message will no longer repeat\))?$/i;

const test = playwrightTest.extend<{ runtimeWarnings: void }>({
  runtimeWarnings: [
    async ({ page }, use, testInfo) => {
      const warnings: string[] = [];
      const expectedBrowserWarnings = new Map<string, number>();
      const isTrackedPublicPageSuite = testInfo.titlePath.some((title) =>
        title === 'PR smoke suite' || title.startsWith('WCAG 2.2 AAA audit:')
      );
      const originalWarn = console.warn;
      const onBrowserConsole = (message: ConsoleMessage) => {
        if (message.type() !== 'warning') return;

        const text = message.text();
        const expectedWarning = isTrackedPublicPageSuite && (
          text === REDUCED_MOTION_ADVISORY
            ? 'Motion reduced-motion advisory emitted by a tracked public-page E2E test'
            : WEBGL_READBACK_ADVISORY.test(text)
            ? 'Chromium WebGL readback advisory emitted by the decorative landing canvas'
            : undefined
        );

        if (expectedWarning) {
          expectedBrowserWarnings.set(
            expectedWarning,
            (expectedBrowserWarnings.get(expectedWarning) ?? 0) + 1,
          );
          return;
        }

        warnings.push(`[browser] ${text}`);
      };
      const onProcessWarning = (warning: Error) => {
        warnings.push(`[node] ${warning.name}: ${warning.message}`);
      };
      const onTestWarning: typeof console.warn = (...args) => {
        warnings.push(`[test] ${args.map(String).join(' ')}`);
        originalWarn(...args);
      };

      page.on('console', onBrowserConsole);
      process.on('warning', onProcessWarning);
      console.warn = onTestWarning;

      try {
        await use();
      } finally {
        page.off('console', onBrowserConsole);
        process.off('warning', onProcessWarning);
        console.warn = originalWarn;
      }

      for (const [warning, count] of expectedBrowserWarnings) {
        console.info(`[warning-gate] Allowed ${count} documented browser warning(s): ${warning}`);
      }

      expect(warnings, 'Unexpected browser or test-process warnings').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect, test };
