# Valorant Replay Viewer (VRV)

A desktop application that lets you browse and watch Valorant replays, including replays of your friends' matches and team scrimmages, without needing to be in the game at the time.

> Currently in early development, expect bugs and missing features. The app is not yet feature complete and may be unstable.
> Please report any issues you encounter and feel free to leave feedback or suggestions in the project's issue tracker.

Once the app runs [click here](http://localhost:3000) or open "http://localhost:3000" in your browser to access the interface.

## How to use

#### Recent Matches:
- Shows your you recently played matches
- You may download the replay for any finished match

#### Stored Matches:
- Shows you all your stored matches
- You can download the matches to a directory of your choice and share it with others if you want
- You can also import matches that your friends have downloaded with this app

#### Injection:
- Injecting a match allows you to view any replay file (of current game version) in the Valorant Client directly
- After injection **START A REPLAY OF THE FIRST REPLAYABLE MATCH IN YOUR HISTORY**, it will look like the original replay
is loaded initially but once you are loaded in the replay will be the one you have selected for injection.


## Disclaimer

**VRV isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved 
in producing or managing Riot Games properties.**

Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

VRV does not modify the Valorant game client or provide any competitive advantage.
All application behavior is based on observing data exposed via the Riot Messaging Service (RMS),
without injecting code into or altering the game process.

However, VRV is not an official Riot product and relies on undocumented APIs of the Riot Client. As a result, 
its use may violate Riot Games’ Terms of Service.

**Use at your own risk**.


## What it does
Valorant's built-in replay system requires you to download replays manually with no easy way to share them. 
VRV solves this by allowing you to view Replays from all your account's and friends' recent matches in a single interface, 
with no need to coordinate downloads or screen shares.
VRV only supports viewing replays that are recorded by the Valorant servers. That means custom games are as of now not supported.


### Use cases
- **Watch a friend's match** — Pull up any recent match from your friends list and jump straight into the replay, no coordination needed.
- **Async coaching** — Coaches can review team scrimmages at their own pace without needing to be online during the match or rely on a screen share stream. Watch, rewind, and analyze whenever it suits you.

## Security notice

> **Only download VRV from the official release page.**

This application connects to your local Riot Client and has access to your session credentials. A malicious build could steal your Riot Access Token and compromise your account.

- Only run official, releases from the project's release page.
- Do not run modified builds or binaries you received from untrusted sources.

## How it works
Your local Riot client exposes a local API that can be monitored. We can use this to track when matches start / end without
actively needing to poll the Valorant Servers.
For example once a match ends, we can download the stats and replay information for that match and make it available in our app.