<!-- docs/implementation/02-browser-shell.md -->

# Chapter 2: Browser Shell

## Purpose

Build a functional shell that looks and behaves like a tool-oriented workbench before introducing real data processing.

This chapter proves that the repo can support a clear browser UI with plain HTML, CSS, and JavaScript modules.

## Must Track Back To UI Guidelines

This chapter primarily follows:

- `UI Philosophy`
- `Primary UX Goals`
- `Information Architecture`
- `Styling Rules`
- `Accessibility and Usability Rules`

## Repo Paths

- `app/src/index.html`
- `app/src/styles/tokens.css`
- `app/src/styles/base.css`
- `app/src/styles/layout.css`
- `app/src/styles/components.css`
- `app/src/js/main.js`
- `app/src/js/app/bootstrap.js`

## What To Build

Create:

- a top-level shell
- a source-explorer region
- a main workspace region
- an inspector/details region
- a status/jobs region

At this stage, panels may be mostly static, but they should be laid out intentionally and should already feel like a workbench instead of a placeholder marketing page.

## What Not To Build Yet

- no real file parsing
- no worker logic
- no Wasm coupling
- no large component abstraction system

## Recommended Generic Demo

Build a demo shell with:

- fake loaded-source items in the left pane
- a central panel that changes headings or placeholder content
- a status bar showing `Idle`

The purpose is not business value yet. The purpose is to prove panel structure, layout discipline, and inspectable startup code.

## Success Criteria

- the application loads with the intended major regions
- keyboard focus and visible labels are already considered
- the code remains simple and inspectable

## Stopping-Point Notes

When pausing after this chapter, the next file to open is:

- `docs/implementation/03-state-actions-and-rendering.md`
