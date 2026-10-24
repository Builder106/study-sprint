"""Make local HTML previews without changing Supabase template files."""

from pathlib import Path
import sys

templates = Path(sys.argv[1])
assets = Path(sys.argv[2]).resolve()
output = Path(sys.argv[3])
output.mkdir(parents=True, exist_ok=True)

for source in sorted(templates.glob("*.html")):
    markup = source.read_text()
    markup = markup.replace(
        "https://eleihbdoivbetccumpet.supabase.co/storage/v1/object/public/email-assets/",
        f"{assets.as_uri()}/",
    )
    markup = markup.replace(
        "{{ .ConfirmationURL }}", "https://getstudysprint.vercel.app/login"
    )
    (output / source.name).write_text(markup)
