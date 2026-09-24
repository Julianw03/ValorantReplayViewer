## Changelog Version 0.9.0
> ## Breaking Change
> I broke the saving mechanism again...  
> Replays saved before this install will still be in the ``%LOCALAPPDATA%\ValorantReplayViewer\replays`` directory but 
> no longer be visible in the app.

### Overview
- You can now see your current play-state over your username
- You can now change the visible name of a replay and add tags and notes.
- Bunch of background changes around how replays are stored that should allow for some cool functionality down the road.
  (For example searching replays by tags and other stuff!)
### Bug Fixes
- Fixed an issue where the Replay Injection would pick a placeholder that was not visible in your match history.
  (This has the side effect that the match you have to select will be your latest **non-custom** match in your Valorant 
 Match History)

### Known Issues
- The "Recent Matches" tab can show replays that do not usually appear in your match history.
- In "Deathmatch" games your presence will not update that often.
- Custom Games cannot be viewed in match details. Reason for this is that there is no "queue" in custom games. The program can not infer what mode is being
played and therefore won't display any stats. Might change this in the future to be customizable by the user in the UI.

- Replay injection will fail if, within your last 20 matches, you have not played any game that has a replay available.

  This can be fixed by:
    - Starting Valorant and loading into the main menu
    - Playing a game that has a replay available (e.g. Competitive, Unrated, Swiftplay)
    - Reloading your recent matches