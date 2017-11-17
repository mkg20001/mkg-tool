# mkg-tool
Mkg's p2p remote access tool

A tool I created for myself to have easiert remote access to servers.

Feel free to change the admin list (in lib/protocol/auth.js) and bootstrappers and use this for your own purposes.

The snap (`mkg-tool`) is private because otherwise I'd get access to random people's networks downloading this.

# Features

A server. That's the thing the client connects.

A client with the following commands:
- `list`:
    - Lists all peers in the peerdb and the authorization/online state of each
- `forward <host> <remoteaddr> <localaddr>`:
    - Forwards `remoteaddr` on `host` to `localaddr`
- `ssh`:
    - Forwards the ssh port to localhost and executes ssh
- `rmid`
    - Removes the id and associated hostname

# Logs
Logs can be viewed with `journalctl -u snap.mkg-tool.mkg-tool-server.service`
