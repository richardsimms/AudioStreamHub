
> rest-express@1.0.0 dev
Starting Mailgun setup...
Fetching Mailgun domains...
11:03:35 AM [express] serving on port 5000
Domains response: [
  {
    "name": "speasy.app",
    "require_tls": false,
    "skip_verification": false,
    "state": "active",
    "wildcard": false,
    "spam_action": "disabled",
    "created_at": "2025-01-22T03:41:30.000Z",
    "smtp_login": "postmaster@speasy.app",
    "type": "custom",
    "receiving_dns_records": null,
    "sending_dns_records": null,
    "id": "679068eaa4d0b0bd27669f05",
    "is_disabled": false,
    "web_prefix": "email",
    "web_scheme": "http",
    "use_automatic_sender_security": false
  },
  {
    "name": "sandbox1588502a99dd44cc9f2591d5615a5078.mailgun.org",
    "require_tls": false,
    "skip_verification": false,
    "state": "active",
    "wildcard": false,
    "spam_action": "disabled",
    "created_at": "2025-01-22T03:32:48.000Z",
    "smtp_login": "postmaster@sandbox1588502a99dd44cc9f2591d5615a5078.mailgun.org",
    "type": "sandbox",
    "receiving_dns_records": null,
    "sending_dns_records": null,
    "id": "679066e072e1dbb3ba1b402f",
    "is_disabled": false,
    "web_prefix": "email",
    "web_scheme": "http",
    "use_automatic_sender_security": false
  }
]
Found 2 domains in Mailgun account
Using sandbox domain: sandbox1588502a99dd44cc9f2591d5615a5078.mailgun.org
Setting up email routes...
Fetching existing Mailgun routes...
Routes response: [
  {
    "actions": [
      "forward(\"https://7618ae55-dcd1-4178-8a15-04009091ee27-00-q5sdxm13xgps.riker.replit.dev/api/email/incoming\")",
      "stop()"
    ],
    "created_at": "Wed, 22 Jan 2025 10:47:57 GMT",
    "description": "Forward all incoming emails to our API",
    "expression": "match_recipient(\".*@speasy.app\")",
    "id": "6790ccddc297377f98f8966e",
    "priority": 0
  }
]
Found 1 existing routes
Deleting route: 6790ccddc297377f98f8966e
Using webhook URL: https://7618ae55-dcd1-4178-8a15-04009091ee27-00-q5sdxm13xgps.riker.replit.dev/api/email/incoming
Creating new route for email forwarding...
Route configuration: {
  "expression": "match_recipient(\".*@sandbox1588502a99dd44cc9f2591d5615a5078.mailgun.org\")",
  "action": [
    "forward(\"https://7618ae55-dcd1-4178-8a15-04009091ee27-00-q5sdxm13xgps.riker.replit.dev/api/email/incoming\")",
    "stop()"
  ],
  "description": "Forward all incoming emails to our API",
  "priority": 0
}
Successfully created new route: {
  "actions": [
    "forward(\"https://7618ae55-dcd1-4178-8a15-04009091ee27-00-q5sdxm13xgps.riker.replit.dev/api/email/incoming\")",
    "stop()"
  ],
  "created_at": "Wed, 22 Jan 2025 11:03:36 GMT",
  "description": "Forward all incoming emails to our API",
  "expression": "match_recipient(\".*@sandbox1588502a99dd44cc9f2591d5615a5078.mailgun.org\")",
  "id": "6790d088e12c3561074fd5f6",
  "priority": 0
}
Mailgun configuration completed