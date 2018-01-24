const admins = [
  // PeerIDs of the admin(s)
  'QmWoXHkdSWxs38QEEVXUbYhBtKvsWti5AsTMVAukxMMe47', // l
  'QmWu2KoKnUKkTt35e8XzX3V3h6DwdPdJHZVAGCCyuFsYmB' // p
]

module.exports = function isAdmin (conn, cb) {
  conn.getPeerInfo((err, pi) => {
    if (err) return cb(err)
    cb(null, admins.indexOf(pi.id.toB58String()) != -1)
  })
}
