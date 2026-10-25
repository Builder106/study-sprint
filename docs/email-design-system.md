# StudySprint email design system

StudySprint uses Supabase Auth for email and password registration and login, alongside Google sign-in. The confirmation, recovery, and magic-link templates are configured in Supabase. The repository has no product notification sender. This guide records the design rules; it does not change Supabase settings.

Use these rules for account emails when the configured auth flow sends them. Add other email types when the product has a real event and a clear destination for the reader.

## Direction

Use a calm, direct voice and keep lime to a small accent. Give each message one action. Keep the battery as a quiet brand cue. Avoid streak guilt and unsupported progress claims.

Use the wordmark `StudySprint` as live text. The tagline `Focus in. Charge up.` may appear in the header or footer. A static logo can support the wordmark, but the email must still make sense when images are blocked.

## Visual tokens

| Role | Value | Use |
| --- | --- | --- |
| Canvas | `#ececf0` | Email page background |
| Content surface | `#ffffff` | Main message panel |
| Primary text | `#030213` | Headings, body, and button text |
| Secondary text | `#52525b` | Supporting details and footer copy. The app's `#717182` measures 4.06:1 on the canvas, below AA for 14px text; this value measures 7.73:1 on white and 6.56:1 on the canvas |
| Brand accent | `#ccff00` | Primary action fill and small brand details |
| Accent text | `#3d5200` | Links or small text on a light surface |
| Divider | `#e4e4e7` | Rules and panel outlines |

Use the lime as a background fill with dark text. Do not set lime text on white. Use the darker accent for text links and underline them so they remain identifiable without color.

## Type and layout

- Use a single-column layout with a fluid width up to `600px`.
- Keep `24px` horizontal padding on wide screens and `20px` on narrow screens.
- Use the existing 4px spacing rhythm. Common gaps are `8px`, `16px`, `24px`, and `32px`.
- Use a system sans-serif stack such as `Arial, Helvetica, sans-serif`. Keep headings in the same family; email clients may not load the app's web fonts.
- Set body copy at `16px` with at least `24px` line height. Use a `24px` heading with about `30px` line height. Keep secondary copy at `14px` or larger.
- Use an `8px` corner radius for panels and buttons. Avoid shadows, gradients, and decorative framing that compete with the message.

## Components

### Header

Place the StudySprint wordmark at the top left. A small static bolt mark is optional. Do not make the logo the only way to identify the sender.

### Message panel

Use one white panel on the neutral canvas. Start with a short heading, then one or two brief sentences that explain why the reader got the email and what happens next. Leave enough space around the primary action for it to read as the next step.

### Primary action

Use a solid `#ccff00` button with `#030213` text. Give it at least `44px` of height and a clear, verb-led label such as `Confirm email` or `Reset password`. The label should describe the destination or action.

Include a descriptive text link to the same destination when a button cannot be opened. Preserve the auth provider's action URL placeholders exactly. Do not construct token links by hand.

### Footer

Use muted text for the product name, support destination, and relevant privacy or account links. Separate footer items with line breaks or spacing, not pipes or dots. Include an unsubscribe link only for messages that are actually optional product or marketing email. Do not add one to account-security messages unless the delivery rules require it.

## Message structure

Set each email up in this order:

1. Subject that names the action or event.
2. Preheader that adds context without repeating the subject.
3. StudySprint wordmark.
4. One heading and a short explanation.
5. One primary action.
6. A plain-text fallback link and any true expiration or security details.
7. A compact footer with relevant help and privacy links.

Keep the plain-text version complete. It should explain the action, include the destination, and identify StudySprint even when the HTML is unavailable.

## Starter copy: account confirmation

Use this when the Supabase project is configured to require email confirmation. Keep the provider's confirmation URL placeholder in the action link.

**Subject:** Confirm your StudySprint email

**Preheader:** Finish setting up your account.

**Heading:** Confirm your email

**Body:** Use the button below to confirm this email address for your StudySprint account.

**Button:** Confirm email

**Fallback:** If the button does not open, use this link: `{confirmation_url}`

Replace `{confirmation_url}` with the exact URL variable supported by the configured auth provider. It is a documentation placeholder, not Supabase template syntax.

**Security note:** If you did not create this account, you can ignore this email.

The app does not control whether confirmation is required. Check the Supabase Auth setting before assuming all sign-ups send this message.

## Accessibility and rendering

- Keep text readable at 200% zoom and on a narrow phone screen.
- Use semantic headings and descriptive link text. Do not use phrases such as `click here` as the only link label.
- Keep the main action usable with keyboard navigation and a visible focus style wherever the email client supports it.
- Do not rely on color, images, animation, or a dark-mode stylesheet to explain the action.
- Keep decorative artwork in optional backgrounds, so blocked images do not leave broken-image boxes. Keep the product name and action as live text.
- Treat the bolt and other brand graphics as decorative. Provide useful alternative text only when an image carries information.
- Use the same action and destination in the HTML and plain-text versions.
- Before sending a new template, check it with images disabled, at a narrow viewport, and in light and dark appearance settings. Confirm the action URL and fallback link resolve to the intended flow.

## Email types

| Type | Repository status | Design rule |
| --- | --- | --- |
| Registration confirmation | Signup exists; confirmation depends on Supabase project settings | Use the starter copy above when confirmation is enabled |
| Password recovery | Template configured; no recovery action is exposed by the current app | Connect it when a recovery flow is implemented |
| Magic link | Template configured; no magic-link action is exposed by the current app | Connect it when a passwordless flow is implemented |
| Study reminders or summaries | No product email sender exists in the repository | Define timing, user controls, and unsubscribe behavior with the feature |

## Template files

The Supabase Auth templates, plain-text copy, Blender scene, Glaxnimate source, and previews are listed in [the email artwork guide](../design/email/README.md). Confirmation is the only type tied to a current app entry point. Recovery and magic-link templates are set in Supabase, but the app does not use those flows yet.

