# Repository workflow

- This Git repository is the inner `parry-tower/parry-tower` directory. Run Git and project commands here.
- Read `docs/HANDOFF.md` and `docs/PLAN.md` before continuing implementation.
- User terminology: **「本番実装」 includes publication**. Complete implementation, verification, main integration, push, deployment, and checks at the live URL as one authorized task. Do not stop after a local merge or ask again for publication approval within that request.
- Preserve approved character artwork, saved studio poses, and unrelated user files. Keep `output/` review exports out of feature/release commits.
- Verification: `node --test tests/*.test.js`; Python image checks: `python -m unittest discover -s tests -p 'test_*art.py'`. Keep entrypoint, diagnostics, asset query, and CI build identifiers consistent.
- Publication target: <https://donald-shrimp.github.io/parry-tower/>. Confirm GitHub checks/deployment and the live build after pushing main. Keep `docs/HANDOFF.md` current.
