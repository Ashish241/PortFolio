import json
from io import BytesIO
from types import SimpleNamespace
from urllib.error import HTTPError

from app import diagnose_resend


def settings():
    return SimpleNamespace(email_provider='resend', email_api_key='test-secret-key',
                           email_from_address='Portfolio <sender@example.com>',
                           contact_receiver_email='owner@example.com')


def test_diagnostic_stops_on_minimal_403_and_logs_no_private_values(monkeypatch, capsys):
    calls = []

    def reject(request, timeout):
        calls.append(request)
        error = {'name': 'opaque-error', 'message': 'Sender sender@example.com is not verified'}
        raise HTTPError(request.full_url, 403, 'secret reason', {}, BytesIO(json.dumps(error).encode()))

    monkeypatch.setattr(diagnose_resend, 'urlopen', reject)
    assert diagnose_resend.run(settings(), 'testnonce') == 1
    assert len(calls) == 1
    output = capsys.readouterr().out
    assert 'stage=minimal_html status=403 type=unknown' in output
    assert 'fields=from,html,subject,to' in output
    assert 'headers=Authorization,Content-Type' in output
    for private in ('test-secret-key', 'sender@example.com', 'owner@example.com', 'secret reason'):
        assert private not in output


def test_diagnostic_adds_fields_in_order_without_database_access(monkeypatch, capsys):
    calls = []

    class Reply:
        status = 200
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def read(self, size): return b'{"id":"accepted-id"}'

    def accept(request, timeout):
        calls.append((json.loads(request.data), request.get_header('Idempotency-key'),
                      request.full_url, request.get_method()))
        return Reply()

    monkeypatch.setattr(diagnose_resend, 'urlopen', accept)
    assert diagnose_resend.run(settings(), 'testnonce') == 0
    assert len(calls) == 5
    assert [set(body) for body, *_ in calls] == [
        {'from', 'to', 'subject', 'html'},
        {'from', 'to', 'subject', 'html', 'text'},
        {'from', 'to', 'subject', 'html', 'text', 'reply_to'},
        {'from', 'to', 'subject', 'html', 'text', 'reply_to'},
        {'from', 'to', 'subject', 'text', 'reply_to'},
    ]
    assert [key is not None for _, key, *_ in calls] == [False, False, False, True, True]
    assert all(url == 'https://api.resend.com/emails' and method == 'POST' for _, _, url, method in calls)
    output = capsys.readouterr().out
    assert 'all_stages_accepted=True' in output
    assert 'accepted-id' not in output
    assert 'owner@example.com' not in output


def test_diagnostic_checks_outer_whitespace_with_one_normalized_probe(monkeypatch, capsys):
    configured = settings()
    configured.email_from_address += ' '
    requests = []

    def reject(request, timeout):
        requests.append(json.loads(request.data))
        raise HTTPError(request.full_url, 403, 'opaque', {}, BytesIO(b'{}'))

    monkeypatch.setattr(diagnose_resend, 'urlopen', reject)
    assert diagnose_resend.run(configured, 'testnonce') == 1
    assert len(requests) == 2
    assert requests[0]['from'].endswith(' ')
    assert not requests[1]['from'].endswith(' ')
    assert 'sender_outer_whitespace=True' in capsys.readouterr().out
