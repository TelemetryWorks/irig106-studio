# Dependabot review policy

Owner decision, 2026-11-16:

- Review security fixes individually.
- Review semver-major upgrades individually and plan them deliberately.
- Review small patch, minor and action version updates in one batch per repository.

The [Dependabot configuration](../../.github/dependabot.yml) ignores
`version-update:semver-major` for each ecosystem. This limits automatic version
updates; it does not suppress security updates or dismiss security alerts.
Security remediation may require a major upgrade, reviewed explicitly in its
security PR. Weekly schedules, five-PR limits, minor/patch grouping and
`chore(deps)` prefixes remain unchanged.

See GitHub's [Dependabot options reference](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference#ignore).
