# Repository workflow

- Physical development checkout: `E:\Development\parry-tower\parry-tower` (HDD). Use this absolute working directory for future commands and file links.
- The former `C:\Users\EBIHARA\Downloads\parry-tower\parry-tower` path is a compatibility junction to that checkout. The outer C: chat folder is retained; do not use its historical outer repository as the game checkout.
- This Git repository is the inner `parry-tower/parry-tower` directory. Run Git and project commands here.
- Read `docs/HANDOFF.md` and `docs/PLAN.md` before continuing implementation.
- User terminology: **「本番実装」 includes publication**. Complete implementation, verification, main integration, push, deployment, and checks at the live URL as one authorized task. Do not stop after a local merge or ask again for publication approval within that request.
- Preserve approved character artwork, saved studio poses, and unrelated user files. Keep `output/` review exports out of feature/release commits.
- Put user-supplied temporary references in `.local-only/references/` and scratch work in `.local-only/scratch/`. These and conversation attachments are Git-ignored; never force-add, publish, or copy them into tracked assets without the user's instruction. See `docs/LOCAL_FILES.md`. Existing tracked artwork is not temporary merely because its path contains `candidate` or `reference`.
- Verification: `node --test tests/*.test.js`; Python image checks: `python -m unittest discover -s tests -p 'test_*art.py'`. Keep entrypoint, diagnostics, asset query, and CI build identifiers consistent.
- Publication target: <https://donald-shrimp.github.io/parry-tower/>. Confirm GitHub checks/deployment and the live build after pushing main. Keep `docs/HANDOFF.md` current.
