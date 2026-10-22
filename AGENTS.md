<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Potential analytics use the shared cluster-potential helpers and one latest profiling assessment per normalized cluster name, so repeated profiling cannot inflate cluster counts; labels remain the existing assessment source rather than priority scores.
- Route components remain unexported for automatic code splitting; import/export-only libraries load on demand and browser Excel parsing runs through a serialized worker using the unchanged parsers.
- Shared user identity queries are memory-cached through TanStack Query and invalidated on auth changes; database policies remain the authorization boundary.
- Cloud refreshes are serialized and version-checked before fetching changed payloads; cancel pending reads on shell unmount to prevent stale updates.
- App-shell offline support uses generated Workbox workers with one preview-safe registrar; never cache API, auth callbacks or server-function requests.
- Shared dialogs constrain width and height to the viewport; wide data tables scroll locally rather than widening the page.
- Every user-visible feature, menu, fix or design change must add a new top entry in src/lib/changelog.ts in the same turn, since the version is derived from that entry and drives the "Apa yang Baru" notice.
