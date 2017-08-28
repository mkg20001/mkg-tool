const admins = [
  //PeerIDs of the admin(s)
]

module.exports = function isAdmin(conn, cb) {
  conn.getPeerInfo((err, pi) => {
    if (err) return cb(err)
    console.log(pi)
  })
}
