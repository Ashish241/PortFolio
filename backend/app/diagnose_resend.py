"""Temporary, manually invoked Render-only Resend request comparison.

Run with ``python -m app.diagnose_resend --confirm-live-send``. This module is
never imported by the web application and does not access contact records.
"""
import argparse
import hashlib
import json
import sys
from uuid import uuid4
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import get_settings
from app.services.email_service import _resend_config_flags, _resend_error


ENDPOINT = 'https://api.resend.com/emails'


def _send(settings, stage: str, body: dict, nonce: str, *, idempotent: bool = False) -> bool:
    headers = {'Authorization': f'Bearer {settings.email_api_key}',
               'Content-Type': 'application/json'}
    if idempotent:
        headers['Idempotency-Key'] = f'portfolio-diagnostic-{nonce}-{stage}'
    encoded = json.dumps(body, ensure_ascii=True).encode('utf-8')
    request = Request(ENDPOINT, data=encoded, headers=headers, method='POST')
    # Structure only: no headers with values, addresses, body contents, or email IDs.
    print(f'diagnostic stage={stage} method=POST endpoint={ENDPOINT} '
          f'fields={",".join(sorted(body))} headers={",".join(sorted(headers))} '
          f'encoding=utf-8 bytes={len(encoded)}', flush=True)
    try:
        with urlopen(request, timeout=15) as response:
            status = response.status
            payload = json.loads(response.read(4096))
    except HTTPError as error:
        safe = _resend_error(error)
        print(f'diagnostic stage={stage} status={safe.status} type={safe.error_type} '
              f'reason={safe.safe_message}', flush=True)
        return False
    except (URLError, ValueError, UnicodeError, OSError) as error:
        print(f'diagnostic stage={stage} transport_or_response_error={type(error).__name__}', flush=True)
        return False
    if not isinstance(payload, dict) or not payload.get('id'):
        print(f'diagnostic stage={stage} status={status} malformed_success_response=True', flush=True)
        return False
    print(f'diagnostic stage={stage} status={status} accepted=True', flush=True)
    return True


def run(settings, nonce: str) -> int:
    if settings.email_provider != 'resend' or not all((settings.email_api_key,
                                                       settings.email_from_address,
                                                       settings.contact_receiver_email)):
        print('diagnostic configuration_incomplete=True', flush=True)
        return 2
    # API keys have high entropy; a short SHA-256 fingerprint lets the owner
    # compare the Render value with PowerShell without exposing either key.
    key_fingerprint = hashlib.sha256(settings.email_api_key.encode()).hexdigest()[:12]
    print(f'diagnostic config {_resend_config_flags(settings)} '
          f'key_sha256_12={key_fingerprint}', flush=True)
    base = {'from': settings.email_from_address, 'to': [settings.contact_receiver_email],
            'subject': 'Portfolio Resend diagnostic', 'html': '<p>Diagnostic email.</p>'}
    if not _send(settings, 'minimal_html', base, nonce):
        # A single normalized probe determines whether outer whitespace alone
        # explains an otherwise identical minimal request.
        normalized = {**base, 'from': settings.email_from_address.strip(),
                      'to': [settings.contact_receiver_email.strip()]}
        if normalized != base:
            _send(settings, 'minimal_normalized', normalized, nonce)
        return 1
    with_text = {**base, 'text': 'Diagnostic email.'}
    if not _send(settings, 'add_text', with_text, nonce):
        return 1
    with_reply_to = {**with_text, 'reply_to': settings.contact_receiver_email}
    if not _send(settings, 'add_reply_to', with_reply_to, nonce):
        return 1
    if not _send(settings, 'add_idempotency', with_reply_to, nonce, idempotent=True):
        return 1
    production_shape = {key: value for key, value in with_reply_to.items() if key != 'html'}
    if not _send(settings, 'production_text_shape', production_shape, nonce, idempotent=True):
        return 1
    print('diagnostic all_stages_accepted=True', flush=True)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Manual Resend diagnostic; sends up to five test emails.')
    parser.add_argument('--confirm-live-send', action='store_true', required=True)
    args = parser.parse_args()
    if not args.confirm_live_send:
        return 2
    return run(get_settings(), uuid4().hex)


if __name__ == '__main__':
    sys.exit(main())
