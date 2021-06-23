const { createHash } = require('crypto')
const utils = require('./utils')
const fetch = require('node-fetch')
const { URL, URLSearchParams } = require('url')

const defaultHost = 'https://sessionserver.mojang.com'

function loader (moduleOptions) {
  /**
   * Client's Mojang handshake call
   * See http://wiki.vg/Protocol_Encryption#Client
   * @param  {String}   accessToken        Client's accessToken
   * @param  {String}   selectedProfile      Client's selectedProfile
   * @param  {String}   serverid     ASCII encoding of the server ID
   * @param  {String}   sharedsecret Server's secret string
   * @param  {String}   serverkey    Server's encoded public key
   * @param  {Function} cb           (is okay, data returned by server)
   * @async
   */
  async function join (accessToken, selectedProfile, serverid, sharedsecret, serverkey) {
    return await utils.call(
      moduleOptions?.host ??
      defaultHost,
      'session/minecraft/join',
      {
        accessToken,
        selectedProfile,
        serverId: utils.mcHexDigest(createHash('sha1').update(serverid).update(sharedsecret).update(serverkey).digest())
      },
      moduleOptions?.agent
    )
  }

  /**
   * Server's Mojang handshake call
   * @param  {String}   username     Client's username, case-sensitive
   * @param  {String}   serverid     ASCII encoding of the server ID
   * @param  {String}   sharedsecret Server's secret string
   * @param  {String}   serverkey    Server's encoded public key
   * @param  {Function} cb           (is okay, client info)
   * @async
   */
  async function hasJoined (username, serverid, sharedsecret, serverkey) {
    const url = new URL(`${moduleOptions?.host ?? defaultHost}/session/minecraft/hasJoined`)
    const params = {
      username,
      serverId: utils.mcHexDigest(createHash('sha1').update(serverid).update(sharedsecret).update(serverkey).digest())
    }
    url.search = new URLSearchParams(params).toString();

    const data = await fetch(url, { agent: moduleOptions?.agent, method: 'GET' })
      .then((res) => {
        if (res.ok) {
          return res.text()
        } else {
          throw new Error(`HTTP Error: ${res.status} ${res.statusText}`)
        }
      })
    if (data.id !== undefined) return data
    else throw new Error('Failed to verify username!')
  }

  return {
    join: utils.callbackify(join, 5),
    hasJoined: utils.callbackify(hasJoined, 4)
  }
}

module.exports = loader
