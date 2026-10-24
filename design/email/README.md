# StudySprint email artwork

StudySprint account emails use the app's charge bolt as a small visual cue. The templates keep the product name and actions as text, so the message still reads when images are blocked.

## Files

- `charge-bolt.blend` is the editable Blender scene. It imports the landing page's existing charge sculpture and renders a transparent 320 × 320 PNG.
- `charge-mark.project.json` is the editable Glaxnimate project. The animated SVG shows a short bolt reveal. `charge-mark.static.svg` and `charge-mark.reduced-motion.svg` hold the complete still mark.
- The email-compatible PNG exports are `frontend/public/email/charge-bolt.png` and `frontend/public/email/charge-mark.png`. Email templates use them as optional CSS backgrounds, so blocking images leaves the text layout intact without broken-image boxes. Clients that do not support background images simply omit the artwork.
- `previews/` contains browser screenshots made from the template files with sample links. These are design review images, not sent messages.

## Templates

| Supabase template | HTML | Subject |
| --- | --- | --- |
| Confirm sign up | `supabase/templates/confirmation.html` | Confirm your StudySprint email |
| Reset password | `supabase/templates/recovery.html` | Reset your StudySprint password |
| Magic link | `supabase/templates/magic-link.html` | Your StudySprint sign-in link |

Each HTML file keeps Supabase's `{{ .ConfirmationURL }}` variable in the button and fallback link. The matching `.txt` file contains complete plain-text copy for a sender that supports a text part.

Supabase Auth uses the confirmation, recovery, and magic-link templates in this directory. The app exposes only sign-up; whether it sends confirmation mail depends on the project's confirmation setting. Recovery and magic-link flows are not connected yet. The project still uses Supabase's built-in email service. SMTP and product-email delivery are not set up.

The optional images are in the public Supabase Storage bucket `email-assets`, which accepts PNG uploads only. The templates use public URLs as CSS backgrounds. Email clients can omit them when images are blocked, without showing broken-image boxes. The `render-preview.py` helper swaps in local image paths and a sample action URL. Do not use its output as an Auth template. Check the message and action link in an email client before enabling a new flow.
