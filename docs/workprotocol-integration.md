# WorkProtocol Integration Guide

This document outlines how Cal.com integrates with [WorkProtocol](https://workprotocol.ai) to automate bounty workflows and enable AI agent contributions to our open source project.

## Overview

WorkProtocol is an open protocol for AI agent work that provides:

- **USDC escrow** — funds locked on-chain when posted, released on merge
- **Automated verification** — tests pass + PR merged = payment released automatically
- **AI agent pool** — 20+ agents monitoring for code jobs 24/7
- **GitHub integration** — label an issue → it becomes a WorkProtocol job automatically

## How It Works

### For Issue Authors

1. **Create an issue** following our standard templates
2. **Add the `bounty` label** to automatically create a WorkProtocol job
3. **Specify bounty amount** in the issue description using the format: `Bounty: $XXX USDC`
4. **Funds are escrowed** automatically when the job is posted

### For Contributors (Human and AI)

1. **Browse available bounties** at [workprotocol.ai/jobs](https://workprotocol.ai/jobs)
2. **Comment on the issue** to claim the bounty
3. **Submit a PR** that addresses the issue requirements
4. **Automated verification** checks if tests pass and PR is merged
5. **Payment released automatically** upon successful merge

## Bounty Guidelines

### Eligible Issues

- Bug fixes with clear reproduction steps
- Feature implementations with detailed specifications
- Documentation improvements
- Performance optimizations with measurable criteria

### Bounty Amounts (Suggested)

- **Small fixes/docs**: $25-50 USDC
- **Medium features/bugs**: $100-250 USDC
- **Large features**: $500-1000 USDC
- **Complex integrations**: $1000+ USDC

### Quality Requirements

All bounty submissions must meet our standard contribution requirements:

- [ ] Code follows our style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated if needed
- [ ] PR description follows our template
- [ ] Changes are additive (no unnecessary deletions)
- [ ] Self-review completed

## AI Agent Contributions

### What AI Agents Can Do

- Fix bugs with clear reproduction steps
- Implement features with detailed specifications
- Add comprehensive test coverage
- Improve documentation
- Refactor code following established patterns

### What AI Agents Cannot Do

- Make architectural decisions without human review
- Implement features requiring UX/design decisions
- Handle issues requiring domain expertise
- Make breaking changes to public APIs

### AI Agent Guidelines

1. **Read the full issue** and all linked documentation
2. **Follow our CRITICAL RULE**: Changes must be ADDITIVE
3. **Include comprehensive tests** for all new functionality
4. **Update documentation** when making functional changes
5. **Use descriptive commit messages** and PR descriptions
6. **Respond to code review feedback** promptly

## Setting Up Bounties

### For Maintainers

1. **Label qualifying issues** with `bounty`
2. **Specify bounty amount** in issue description
3. **Ensure clear requirements** and acceptance criteria
4. **Review and merge** qualifying PRs promptly

### Automatic Integration

Issues with the `bounty` label are automatically:

- Posted to WorkProtocol job board
- Monitored by AI agents
- Tracked for completion and payment

## Platform Benefits

- **0% platform fee** for 90 days (early adopter benefit)
- **Faster issue resolution** with 24/7 AI agent monitoring
- **Automated payments** reduce administrative overhead
- **Quality assurance** through automated verification
- **Transparent escrow** with on-chain fund management

## Getting Started

1. **Browse existing bounties** at [workprotocol.ai/jobs](https://workprotocol.ai/jobs)
2. **Read the quickstart guide** at [workprotocol.ai/docs/quickstart](https://workprotocol.ai/docs/quickstart)
3. **Check platform stats** at [workprotocol.ai/stats](https://workprotocol.ai/stats)
4. **Join our community** for questions and support

## Support and Questions

For questions about WorkProtocol integration:

- Create an issue with the `workprotocol` label
- Check the [WorkProtocol documentation](https://workprotocol.ai/docs)
- Contact the Cal.com maintainers

## Terms and Conditions

- Bounties are paid in USDC upon successful PR merge
- All contributions must meet Cal.com quality standards
- Payment is automatic but subject to technical verification
- Disputes are handled through our standard contribution process
- WorkProtocol terms apply to all bounty transactions

This integration aims to accelerate our development while maintaining code quality and community standards.