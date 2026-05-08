## Changelog Version 0.5.0
### Overview
This update primarily focuses on backend improvements with minimal expected impact on user-facing behavior.

Changes include:
  - Valorant API Url's should now be configured automatically based on your regions' config based on an intial config fetch.
  - Messages (from Riot Client to the internal Managers) should now be passed faster (as we use a prefix tree instead of a regex per listener).
  - Major rewrite of the Object and Map Manager classes to allow for composition instead of clunky inheritance.
  - Finally, we some basic unit tests :)

### Bug Fixes
- _None_

### Known Issues
- When running valorant for the first time after a version update the replay manager will wrongly assume that the old version is still active.
This can be fixed by: 
    - Starting Valorant and loading into the main menu
    - Exiting Valorant
    - Restarting Valorant as this will overwrite the stale version information from the file.

- The Replay injection will fail if within your last 10 matches you have not played any game that has a replay available.
This can be fixed by:
    - Starting Valorant and loading into the main menu
    - Playing a game that has a replay available (e.g. Competitive, Unrated, Swiftplay)
    - Reloading your recent matches