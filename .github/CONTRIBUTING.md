> [!WARNING]
> These new guidelines are a heavy work in progress and do not apply yet. They will be revised with feedback from the
> community to form the final text.

# Natsumi Contributing Guidelines
## 1. Introduction
Thank you for showing your interest in making Natsumi Browser better!

This is the Contributing Guidelines document, which describes many of the expectations we have on all contributors that
submit bug reports, contribute code, etc., as well as things you can expect from us as the Maintainers of the Natsumi
Browser Project. We expect all current and future contributors to have read and agreed to this document before
contributing to the Project.

This document may sound like unnecessary legalese (it probably is tbh), but please give it a good read, it's basically a
guide to the dos and don'ts of contributing to the Project!

### 1.1. Definitions
We've listed some of the terms we use frequently throughout the Guidelines as well as the definitions for them.

- "Project", "Natsumi Project" or "Natsumi": The Natsumi Browser project.
- "Repository": The repository for the Natsumi Browser project (the repository you're on right now, unless you're on a
  fork).
- "we", "us" or "Maintainers": The core maintainers working on the Natsumi Browser project.
- "Contributor Guidelines" or "Guidelines": The Contributing Guidelines document (what you're reading right now).
- "Code of Conduct": The [Code of Conduct](https://github.com/greeeen-dev/natsumi-browser/blob/main/CODE_OF_CONDUCT.md)
  document.
- "License": The open-source license used to license 

## 2. Reporting issues
Natsumi makes use of GitHub's Issues feature to track bug reports and feature suggestions. When you open an Issue, please
make sure you use the correct Issue template.

### 2.1. Submitting bug reports
If you found a bug, please open a GitHub Issue using the **Bug report** template.
- If there's already an Issue for the bug, **do not open another one**, and add on to the existing Issue instead. You
  are free to add more details about the bug, this way we can more easily patch bugs.
- If the bug is limited to a specific branch (e.g. main, dev), please say so in the description.
- If you're reporting bugs that happen when other themes/mods conflict with Natsumi, please do NOT open bug reports for
  them.

### 2.2. Submitting feature requests
If you have feedback for Natsumi, please open a GitHub issue using the **Feature request** template.
- If there's already an Issue for the feature request, **do not open another one**, and add on to the existing Issue. You
  are free to add on to the feedback by giving your suggestions on how the feature could be implemented.
- If your feature request is related to a bug in an existing Issue (e.g. suggesting a potential solution to a problem),
  please add on to the bug report instead.

## 3. Code contributions
As an open-source project, we welcome community contributions that aim to improve Natsumi for everyone. If you wish to
contribute code, you may **fork the repository**, add changes to your fork, then open a Pull Request.

### 3.1. Using branches
Natsumi has three main branches:
- `main`: The stable branch reflecting the latest release for Natsumi.
- `bugfix`: A dedicated branch for fast-tracking bug fixes onto the stable release ahead of the next major or minor
  release.
- `dev`: The main branch used for development of new features for the next major or minor release.

If you wish to contribute your code to the project, please **fork the repository**, add your changes to your fork, then
open a Pull request.
- If your PR fixes a bug or addresses a feature request, please reference the relevant Issues. This way, people (including
  us) can know if we need to do work to fix an issue, or if we just need to merge a Pull Request.
- Please make sure you've tested your code. Include screenshots/screen recordings in the Pull Request so we know how your
  contributed code will work.
- **Do not attempt to add support for any browser Natsumi intentionally does not support.** Natsumi does not support such
  browsers either due to significant compatibility issues, poor reputation or stances against Natsumi's core values.

## 4. Guidelines enforcement
All contributions shall be subject to this repository's Code of Conduct, as well as any other policies described on the
Guidelines. The Code of Conduct and Contributing Guidelines only provide a rough idea of the expectations on contributors;
it is not a comprehensive list. If you are unsure if your contribution bypasses the Code of Conduct or Contributor
Guidelines, err on the side of caution. Do not attempt to use loopholes to bypass the Code of Conduct or Contributor
Guidelines.

### 4.1. Sanctions for guidelines violations
Maintainers reserve all rights to issue sanctions if you violate the Guidelines. Sanctions may include:
- A verbal warning from a Maintainer, mainly through Issue or Pull Request comments
- Restriction from creating Issues or contributing code to the Project

## 5. AI policy
The Natsumi Project takes great pride on the fact that it is not "vibe coded" unlike certain browser mod projects. Although
we acknowledge the potential benefits of AI, we value genuine, high-quality contributions made by human developers and refuse
to accept low-quality AI-generated submissions, even if they are made in good faith.

Therefore, for every submission, we will enforce the following:
- Any use of AI **must be declared** regardless of extent or intent
- All contributions will be subject to strict quality control by Maintainers to combat low quality submissions and forms of
  "vibe coding"
- All contributions must have a description on a **per-file basis** describing the changes and the purpose of the changes in
  the Pull Request description
- All contributions should not add features that focus on or incorporate AI, regardless of whether it uses on-device or
  on-cloud models, with exemptions listed in 5.1

### 5.1. Exemptions to this policy
The following use of AI-related contributions are explicitly allowed:
- Adding support for a browser with optional AI features, regardless of whether they are opt-in or out-out (such as Firefox
  and Floorp)
- Implementing CSS styling for built-in browser AI features (such as Firefox AI tabs and Floorp OS) without use of JS (unless
  required to apply CSS styling - this may be the case if you need to style shadow DOM elements)

Even with these exceptions, your contributions must follow the rest of the AI policy where possible.

### 5.2. AI policy violations
The Natsumi Project takes violations of this policy very seriously and will take action to enforce the policy to the greatest
extent possible within the Project. If you are found to have intentionally violated this policy, your contributions will be
removed or replaced and you will be permanently restricted from making any further contributions.

## 6. Licensing
By contributing code to the Natsumi Project, you agree to license your contributions under the GNU General Public License
version 3 (GPLv3).

### 6.1. Changes to the License
Should we need to change the License for whatever reason, we will ask you for your consent if your code contributions are
present in the latest version of the Project's source code. You may choose to accept or object to the License change, though
we expect that you respond within a reasonable time. If you object to the License change or do not respond within a reasonable
timeframe, your contributions may be removed.
