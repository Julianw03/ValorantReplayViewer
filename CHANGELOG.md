## Changelog Version 0.4.0
- You can now see the download state of your matches in the recent tab already.
- Bunch of stuff changed in the backend to fix inconsistencies and make working with the replay manager easier.

### Bug Fixes
- Fixed a bug where username and tagline were empty as of the new patch.

### Known Issues
- When running valorant for the first time after a version update the replay manager will wrongly assume that the old version is still active.
This can be fixed by: 
    - Starting Valorant and loading into the main menu
    - Exiting Valorant
    - Restarting Valorant as this will overwrite the stale version information from the file.
- I have no way of verifying the SGP hosts for regions other than ``EU``. Should something NOT work for you and you are from outside the `EU` Region please do the following:
    - Start Valorant
    - Go to your match history and (re-) download a replay
    - Exit Valorant
    - ``%LOCALAPPDATA%/VALORANT/Saved/Logs`` should now contain a file called ``ShooterGame.log``. Please send me this file and the region you are playing in so I can add support for your region as well.
    **DO NOT UPLOAD THIS FILE TO GITHUB ISSUES. IT MAY CONTAIN SENSITIVE INFORMATION**. Instead, send it to me via discord: ``iambadatplaying``.
