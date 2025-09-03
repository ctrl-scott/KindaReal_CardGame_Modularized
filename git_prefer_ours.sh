git checkout --ours $(git diff --name-only --diff-filter=U)
git add $(git diff --name-only --diff-filter=U)
git commit -m "Merge: prefer ours during conflict resolution"
git push
