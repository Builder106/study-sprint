# Charge feedback

The charge preview plays this transparent, text-free sequence once after a sample session is logged.
Eight streaks converge around the existing BatteryBolt, then two rings expand and disappear. The
scene is 400 × 400 at 30 fps for 72 frames.

Authored with Lottie Creator's native WebMCP tools in the
[editable project](https://creator.lottiefiles.com/?fileId=b27fb8dd-3942-45c1-b814-44a2b3120c42).
`create.ts` and `animate.ts` retain the scripts passed to Creator's `execute_typescript` tool. They
run in its sandbox after tool discovery; they are not application modules or standalone scripts.
`layers.json` records the layer IDs returned by the original creation run. Recreating the scene
produces new IDs.

The exported asset is `frontend/public/landing/charge-flow.json`. It uses only shape layers,
opacity, scale, and position keyframes. The application uses the lazy-loaded light SVG player from
`lottie-web` 5.13.0. No image, font, expression, or remote asset is embedded. The unformatted export
is 9,713 bytes; repository formatting brings it to 20,205 bytes, below the 35 KB asset budget.

The existing BatteryBolt and visible status are the static fallback. Reduced motion skips both the
player import and asset request. Pause removes the overlay. The animation carries no information
that is absent from the charge result.

Local discovery, tool responses, source export, and visual evidence are retained under
`artifacts/lottie/charge-flow/v001/`. Reference-site capture is a separate, incomplete workflow
stage.
